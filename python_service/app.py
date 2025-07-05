from flask import Flask, request, jsonify
import face_recognition
import numpy as np
import os
import json
import pickle
import uuid
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configuration
ENCODINGS_DIR = os.path.join(os.path.dirname(__file__), 'encodings')
ENCODINGS_FILE = os.path.join(ENCODINGS_DIR, 'face_encodings.pickle')
# Lower tolerance value for stricter face matching (0.5 is more strict than 0.6)
# This will reduce false positives but might increase false negatives
TOLERANCE = 0.5  # Lower is more strict, range is typically 0.4-0.6

# Ensure encodings directory exists
os.makedirs(ENCODINGS_DIR, exist_ok=True)

# Load existing face encodings if available
def load_encodings():
    if os.path.exists(ENCODINGS_FILE):
        try:
            with open(ENCODINGS_FILE, 'rb') as f:
                data = pickle.load(f)
            
            # Ensure backward compatibility with older data format
            if 'metadata' not in data:
                data['metadata'] = [{} for _ in range(len(data['encodings']))]
            
            return data
        except Exception as e:
            print(f"Error loading encodings: {e}")
            # If there's an error, return a fresh data structure
            return {'student_ids': [], 'encoding_ids': [], 'encodings': [], 'metadata': []}
    return {'student_ids': [], 'encoding_ids': [], 'encodings': [], 'metadata': []}

# Save face encodings
def save_encodings(encodings_data):
    # Ensure the structure is complete before saving
    if 'metadata' not in encodings_data:
        encodings_data['metadata'] = [{} for _ in range(len(encodings_data['encodings']))]
    
    with open(ENCODINGS_FILE, 'wb') as f:
        pickle.dump(encodings_data, f)

@app.route('/encode-face', methods=['POST'])
def encode_face():
    if 'photoPath' not in request.json or 'studentId' not in request.json:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    photo_path = request.json['photoPath']
    student_id = request.json['studentId']
    
    # Optional metadata
    metadata = {}
    if 'description' in request.json:
        metadata['description'] = request.json['description']
    if 'angle' in request.json:
        metadata['angle'] = request.json['angle']
    
    if not os.path.exists(photo_path):
        return jsonify({'error': 'Image file not found'}), 404
    
    try:
        # Load the image
        image = face_recognition.load_image_file(photo_path)
        
        # Find all face locations in the image
        face_locations = face_recognition.face_locations(image, model="hog")
        
        if len(face_locations) == 0:
            return jsonify({'error': 'No face detected in the image'}), 400
        
        if len(face_locations) > 1:
            return jsonify({'error': 'Multiple faces detected in the image'}), 400
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        # Convert numpy array to list for JSON serialization
        encoding_list = face_encodings[0].tolist()
        
        # Generate a unique ID for this encoding
        encoding_id = str(uuid.uuid4())
        
        # Load existing encodings
        encodings_data = load_encodings()
        
        # Add new encoding with unique ID
        encodings_data['student_ids'].append(student_id)
        encodings_data['encoding_ids'].append(encoding_id)
        encodings_data['encodings'].append(encoding_list)
        
        # Add metadata
        if 'metadata' not in encodings_data:
            encodings_data['metadata'] = [{} for _ in range(len(encodings_data['encodings']) - 1)]
            encodings_data['metadata'].append(metadata)
        else:
            encodings_data['metadata'].append(metadata)
        
        # Save updated encodings
        save_encodings(encodings_data)
        
        return jsonify({
            'success': True,
            'message': 'Face encoded successfully',
            'encodingId': encoding_id,
            'encoding': json.dumps(encoding_list)
        })
        
    except Exception as e:
        print(f"Error in encode-face: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/delete-encoding', methods=['POST'])
def delete_encoding():
    if 'encodingId' not in request.json:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    encoding_id = request.json['encodingId']
    
    try:
        # Load existing encodings
        encodings_data = load_encodings()
        
        # Check if encoding exists
        if encoding_id not in encodings_data['encoding_ids']:
            return jsonify({'error': 'Encoding not found'}), 404
        
        # Find the index of the encoding
        idx = encodings_data['encoding_ids'].index(encoding_id)
        
        # Remove the encoding
        encodings_data['student_ids'].pop(idx)
        encodings_data['encoding_ids'].pop(idx)
        encodings_data['encodings'].pop(idx)
        
        # Remove metadata if it exists
        if 'metadata' in encodings_data and len(encodings_data['metadata']) > idx:
            encodings_data['metadata'].pop(idx)
        
        # Save updated encodings
        save_encodings(encodings_data)
        
        return jsonify({
            'success': True,
            'message': 'Face encoding deleted successfully'
        })
        
    except Exception as e:
        print(f"Error in delete-encoding: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/verify-face', methods=['POST'])
def verify_face():
    # Debug log the request
    print("Received verify-face request with data:", request.json)
    
    if 'photoPath' not in request.json or 'studentId' not in request.json:
        print(f"Missing required parameters. Received: {list(request.json.keys())}")
        return jsonify({'error': 'Missing required parameters'}), 400
    
    photo_path = request.json['photoPath']
    student_id = request.json['studentId']
    
    if not os.path.exists(photo_path):
        return jsonify({'error': 'Image file not found'}), 404
    
    try:
        # Load existing encodings
        encodings_data = load_encodings()
        
        # Get all encodings for this student
        student_indices = [i for i, sid in enumerate(encodings_data['student_ids']) if sid == student_id]
        
        if not student_indices:
            return jsonify({
                'match': False,
                'message': 'Student not found in database',
                'confidence': 0,
                'encodingId': None
            })
        
        # Get the stored encodings for this student
        stored_encodings = [np.array(encodings_data['encodings'][i]) for i in student_indices]
        encoding_ids = [encodings_data['encoding_ids'][i] for i in student_indices]
        
        # Get metadata if available
        metadata_list = []
        if 'metadata' in encodings_data and len(encodings_data['metadata']) > 0:
            metadata_list = [encodings_data['metadata'][i] if i < len(encodings_data['metadata']) else {} for i in student_indices]
        
        # Load the image to verify
        unknown_image = face_recognition.load_image_file(photo_path)
        
        # Find faces in the image - try both HOG and CNN models for better accuracy
        # HOG is faster but less accurate, CNN is slower but more accurate
        # First try HOG model
        face_locations = face_recognition.face_locations(unknown_image, model="hog")
        
        # If no face found with HOG or multiple faces found, try CNN model for better accuracy
        use_cnn = False
        if len(face_locations) != 1:
            try:
                face_locations = face_recognition.face_locations(unknown_image, model="cnn")
                use_cnn = True
                print("Using CNN model for face detection")
            except Exception as e:
                print(f"CNN model failed, falling back to HOG: {str(e)}")
                # If CNN fails (e.g., no GPU), fall back to HOG results
                face_locations = face_recognition.face_locations(unknown_image, model="hog")
        
        if len(face_locations) == 0:
            return jsonify({
                'match': False,
                'message': 'No face detected in the verification image',
                'confidence': 0,
                'encodingId': None
            })
        
        if len(face_locations) > 1:
            return jsonify({
                'match': False,
                'message': 'Multiple faces detected in the verification image',
                'confidence': 0,
                'encodingId': None
            })
        
        # Get face encodings for the unknown image
        # Use higher number of jitters for more accuracy (default is 1)
        # Higher jitter means more accurate but slower processing
        unknown_encoding = face_recognition.face_encodings(
            unknown_image, 
            face_locations,
            num_jitters=3  # Increase from default 1 to 3 for better accuracy
        )[0]
        
        # Compare faces with all stored encodings for this student
        face_distances = face_recognition.face_distance(stored_encodings, unknown_encoding)
        
        # Find the best match
        best_match_index = np.argmin(face_distances)
        best_match_distance = face_distances[best_match_index]
        
        # More strict matching threshold if using CNN model
        match_tolerance = TOLERANCE * 0.9 if use_cnn else TOLERANCE
        match = best_match_distance <= match_tolerance
        
        # Convert face distance to confidence score (0-100%)
        # Improved confidence calculation for better accuracy
        # The face_distance is between 0 and 2, where 0 is a perfect match
        # We want to convert it to a confidence percentage where 100% is a perfect match
        raw_confidence = (1 - best_match_distance) * 100
        
        # Apply sigmoid-like scaling to emphasize differences in the middle range
        # This makes the confidence score more intuitive and discriminative
        confidence = 100 / (1 + np.exp(-0.1 * (raw_confidence - 50))) if raw_confidence > 0 else 0
        
        # Get metadata for the best match
        best_metadata = {}
        if metadata_list and best_match_index < len(metadata_list):
            best_metadata = metadata_list[best_match_index]
        
        # Only consider it a match if confidence is above 70%
        final_match = match and confidence >= 70
        
        return jsonify({
            'match': bool(final_match),
            'confidence': float(confidence),
            'message': 'Face verification successful' if final_match else 'Face verification failed',
            'encodingId': encoding_ids[best_match_index] if final_match else None,
            'metadata': best_metadata if final_match else {},
            'raw_confidence': float(raw_confidence),  # Include raw confidence for debugging
            'detection_model': 'CNN' if use_cnn else 'HOG'  # Include which model was used
        })
        
    except Exception as e:
        print(f"Error in verify-face: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/batch-verify', methods=['POST'])
def batch_verify():
    if 'photoPath' not in request.json:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    photo_path = request.json['photoPath']
    
    # Optional parameters
    min_confidence = float(request.json.get('minConfidence', 0))
    max_results = int(request.json.get('maxResults', 5))
    
    if not os.path.exists(photo_path):
        return jsonify({'error': 'Image file not found'}), 404
    
    try:
        # Load existing encodings
        encodings_data = load_encodings()
        
        if not encodings_data['encodings']:
            return jsonify({
                'match': False,
                'message': 'No encodings in database',
                'matches': []
            })
        
        # Load the image to verify
        unknown_image = face_recognition.load_image_file(photo_path)
        
        # Find faces in the image
        face_locations = face_recognition.face_locations(unknown_image, model="hog")
        
        if len(face_locations) == 0:
            return jsonify({
                'match': False,
                'message': 'No face detected in the verification image',
                'matches': []
            })
        
        if len(face_locations) > 1:
            return jsonify({
                'match': False,
                'message': 'Multiple faces detected in the verification image',
                'matches': []
            })
        
        # Get face encodings for the unknown image
        unknown_encoding = face_recognition.face_encodings(unknown_image, face_locations)[0]
        
        # Compare faces with all stored encodings
        all_encodings = [np.array(enc) for enc in encodings_data['encodings']]
        face_distances = face_recognition.face_distance(all_encodings, unknown_encoding)
        
        # Group results by student ID to find the best match per student
        student_best_matches = {}
        
        for i, distance in enumerate(face_distances):
            student_id = encodings_data['student_ids'][i]
            confidence = (1 - distance) * 100
            
            if confidence < min_confidence:
                continue
                
            if student_id not in student_best_matches or confidence > student_best_matches[student_id]['confidence']:
                metadata = {}
                if 'metadata' in encodings_data and i < len(encodings_data['metadata']):
                    metadata = encodings_data['metadata'][i]
                    
                student_best_matches[student_id] = {
                    'studentId': student_id,
                    'encodingId': encodings_data['encoding_ids'][i],
                    'confidence': float(confidence),
                    'distance': float(distance),
                    'metadata': metadata
                }
        
        # Convert to list and sort by confidence
        matches = list(student_best_matches.values())
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Limit the number of results
        matches = matches[:max_results]
        
        return jsonify({
            'match': len(matches) > 0,
            'message': f"Found {len(matches)} potential matches" if matches else "No matches found",
            'matches': matches
        })
        
    except Exception as e:
        print(f"Error in batch-verify: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get-student-encodings', methods=['GET'])
def get_student_encodings():
    student_id = request.args.get('studentId')
    
    if not student_id:
        return jsonify({'error': 'Missing studentId parameter'}), 400
    
    try:
        # Load existing encodings
        encodings_data = load_encodings()
        
        # Get all encodings for this student
        student_indices = [i for i, sid in enumerate(encodings_data['student_ids']) if sid == student_id]
        
        if not student_indices:
            return jsonify({
                'success': False,
                'message': 'No encodings found for this student',
                'encodings': []
            })
        
        # Get the encoding IDs and metadata
        result = []
        for idx in student_indices:
            encoding_data = {
                'encodingId': encodings_data['encoding_ids'][idx],
            }
            
            # Add metadata if available
            if 'metadata' in encodings_data and idx < len(encodings_data['metadata']):
                encoding_data['metadata'] = encodings_data['metadata'][idx]
            
            result.append(encoding_data)
        
        return jsonify({
            'success': True,
            'message': f'Found {len(result)} encodings for student {student_id}',
            'encodings': result
        })
        
    except Exception as e:
        print(f"Error in get-student-encodings: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5321, debug=True) 