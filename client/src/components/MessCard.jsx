// src/components/MessCard.jsx
export default function MessCard({ mess, onEdit, onDelete, onBook, showBookButton, showActions }) {
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
        {mess.image_url && (
          <img 
            src={mess.image_url} 
            className="card-img-top" 
            alt={mess.name}
            style={{ height: '220px', objectFit: 'cover' }}
          />
        )}
        <div className="card-body p-4">
          <h5 className="card-title fw-bold mb-3" style={{ color: '#1a3a5c' }}>
            {mess.name}
          </h5>
          <p className="card-text mb-3">
            <span className="badge" style={{ backgroundColor: '#ff8c42', color: 'white', padding: '8px 15px', borderRadius: '20px' }}>
              📍 {mess.city || mess.location || 'Location N/A'}
            </span>
          </p>
          
          {mess.delivery_radius_km && (
            <p className="card-text text-muted small mb-2">
              <strong>Delivery Range:</strong> {mess.delivery_radius_km} km
            </p>
          )}
          
          <p className="h5 fw-bold mb-0" style={{ color: '#28a745' }}>
            Rs. {mess.monthly_price || mess.price}/month
          </p>
        </div>
        <div className="card-footer bg-white border-0 p-3">
          {showBookButton && (
            <button 
              className="btn w-100 fw-bold"
              onClick={onBook}
              style={{ 
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                padding: '12px'
              }}
            >
              Subscribe Now
            </button>
          )}
          {showActions && (
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
          )}
        </div>
      </div>
    </div>
  );
}