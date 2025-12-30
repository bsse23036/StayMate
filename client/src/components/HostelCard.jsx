// src/components/HostelCard.jsx
export default function HostelCard({ hostel, onBook, onEdit, onDelete, showBookButton, showActions }) {
  return (
    <div className="col">
      <div className="card h-100 shadow border-0" style={{ transition: 'transform 0.2s' }} 
           onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
           onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
        {(hostel.main_image_url || hostel.image_url) && (
          <img 
            src={hostel.main_image_url || hostel.image_url} 
            className="card-img-top" 
            alt={hostel.name}
            style={{ height: '200px', objectFit: 'cover' }}
          />
        )}
        <div className="card-body">
          <h5 className="card-title fw-bold" style={{ color: '#1a3a5c' }}>{hostel.name}</h5>
          <p className="card-text">
            <span className="badge" style={{ backgroundColor: '#ff8c42' }}>
              📍 {hostel.city || hostel.location || 'Location N/A'}
            </span>
          </p>
          {hostel.address && (
            <p className="card-text text-muted small">
              <strong>Address:</strong> {hostel.address}
            </p>
          )}
          {hostel.description && (
            <p className="card-text text-muted small">{hostel.description}</p>
          )}
          
          {/* Facilities */}
          <div className="mb-2">
            {hostel.wifi_available && (
              <span className="badge bg-info me-1">📶 WiFi</span>
            )}
            {hostel.generator_available && (
              <span className="badge bg-success">⚡ Generator</span>
            )}
          </div>
          
          <p className="h5 fw-bold" style={{ color: '#ff8c42' }}>
            Rs. {hostel.price_per_month || hostel.price}/month
          </p>
        </div>
        <div className="card-footer bg-white border-top-0">
          {showBookButton && (
            <button 
              className="btn w-100 text-white fw-bold"
              onClick={onBook}
              style={{ backgroundColor: '#1a3a5c' }}
            >
              Book Now
            </button>
          )}
          {showActions && (
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-secondary flex-fill"
                onClick={onEdit}
              >
                ✏️ Edit
              </button>
              <button 
                className="btn btn-outline-danger flex-fill"
                onClick={onDelete}
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}