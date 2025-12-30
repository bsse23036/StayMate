// src/components/MessCard.jsx
export default function MessCard({ mess, onEdit, onDelete, onBook, showBookButton, showActions }) {
  return (
    <div className="col">
      <div className="card h-100 shadow border-0" style={{ transition: 'transform 0.2s' }}
           onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
           onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
        {mess.image_url && (
          <img 
            src={mess.image_url} 
            className="card-img-top" 
            alt={mess.name}
            style={{ height: '200px', objectFit: 'cover' }}
          />
        )}
        <div className="card-body">
          <h5 className="card-title fw-bold" style={{ color: '#1a3a5c' }}>{mess.name}</h5>
          <p className="card-text">
            <span className="badge" style={{ backgroundColor: '#ff8c42' }}>
              📍 {mess.city || mess.location || 'Location N/A'}
            </span>
          </p>
          
          {mess.delivery_radius_km && (
            <p className="card-text text-muted small">
              <strong>Delivery Range:</strong> {mess.delivery_radius_km} km
            </p>
          )}
          
          {mess.menu_description && (
            <p className="card-text text-muted small">{mess.menu_description}</p>
          )}
          
          <p className="h5 fw-bold" style={{ color: '#28a745' }}>
            Rs. {mess.monthly_price || mess.price}/month
          </p>
        </div>
        <div className="card-footer bg-white border-top-0">
          {showBookButton && (
            <button 
              className="btn btn-success w-100 fw-bold"
              onClick={onBook}
            >
              Subscribe Now
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