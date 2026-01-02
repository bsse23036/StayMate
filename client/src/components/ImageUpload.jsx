// src/components/ImageUpload.jsx
import { useState } from 'react';

export default function ImageUpload({ onImageSelect, currentImageUrl, loading }) {
  const [preview, setPreview] = useState(currentImageUrl);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Call parent callback
      onImageSelect(file);
    }
  };

  return (
    <div>
      <div className="mb-3">
        <input
          type="file"
          className="form-control"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
          style={{ borderRadius: '10px' }}
        />
        <small className="text-muted">Max file size: 5MB. Supported formats: JPG, PNG, GIF</small>
      </div>

      {(preview || currentImageUrl) && (
        <div className="mt-3">
          <p className="fw-bold mb-2">Image Preview:</p>
          <img 
            src={preview || currentImageUrl} 
            alt="Preview" 
            style={{ 
              maxWidth: '300px', 
              maxHeight: '200px', 
              objectFit: 'cover',
              borderRadius: '10px',
              border: '2px solid #e0e0e0'
            }}
          />
        </div>
      )}

      {loading && (
        <div className="mt-2">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="text-muted">Uploading image...</span>
        </div>
      )}
    </div>
  );
}