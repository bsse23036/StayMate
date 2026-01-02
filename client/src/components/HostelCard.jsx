// src/components/HostelCard.jsx
export default function HostelCard({ hostel, onBook, onEdit, onDelete, onManageRooms, showBookButton, showActions }) {
  return (
    <div className="col">
      <div 
        className="card h-100 border-0 shadow-sm" 
        style={{ 
          transition: 'all 0.3s ease',
          borderRadius: '15px',
          overflow: 'hidden'
        }} 
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-10px)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        }}
      >
        {(hostel.main_image_url || hostel.image_url) && (
          <img 
            src={hostel.main_image_url || hostel.image_url} 
            className="card-img-top" 
            alt={hostel.name}
            style={{ height: '220px', objectFit: 'cover' }}
          />
        )}
        <div className="card-body p-4">
          <h5 className="card-title fw-bold mb-3" style={{ color: '#1a3a5c' }}>
            {hostel.name}
          </h5>
          <p className="card-text mb-3">
            <span className="badge" style={{ backgroundColor: '#ff8c42', color: 'white', padding: '8px 15px', borderRadius: '20px' }}>
              📍 {hostel.city || hostel.location || 'Location N/A'}
            </span>
          </p>
          {hostel.address && (
            <p className="card-text text-muted small mb-2">
              <strong>Address:</strong> {hostel.address}
            </p>
          )}
          {hostel.description && (
            <p className="card-text text-muted small mb-3">{hostel.description}</p>
          )}
          
          {/* Facilities */}
          <div className="mb-3">
            {hostel.wifi_available && (
              <span className="badge bg-info me-2" style={{ padding: '6px 12px', borderRadius: '15px' }}>
                📶 WiFi
              </span>
            )}
            {hostel.generator_available && (
              <span className="badge bg-success" style={{ padding: '6px 12px', borderRadius: '15px' }}>
                ⚡ Generator
              </span>
            )}
          </div>
          
          <p className="h5 fw-bold mb-0" style={{ color: '#ff8c42' }}>
            Rs. {hostel.price_per_month || hostel.price}/month
          </p>
        </div>
        <div className="card-footer bg-white border-0 p-3">
          {showBookButton && (
            <button 
              className="btn w-100 text-white fw-bold"
              onClick={onBook}
              style={{ 
                backgroundColor: '#1a3a5c',
                border: 'none',
                borderRadius: '25px',
                padding: '12px'
              }}
            >
              Book Now
            </button>
          )}
          {showActions && (
            <div className="d-flex flex-column gap-2">
              <button 
                className="btn btn-outline-primary w-100"
                onClick={onManageRooms}
                style={{ borderRadius: '25px' }}
              >
                🛏️ Manage Rooms
              </button>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-secondary flex-fill"
                  onClick={onEdit}
                  style={{ borderRadius: '25px' }}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-outline-danger flex-fill"
                  onClick={onDelete}
                  style={{ borderRadius: '25px' }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}