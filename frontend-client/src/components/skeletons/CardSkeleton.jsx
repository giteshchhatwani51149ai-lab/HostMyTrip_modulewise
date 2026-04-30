import React from 'react';
import './skeletons.css';

/**
 * CardSkeleton — pulse-animated placeholder for flight/hotel cards.
 *
 * Props:
 *   count    {number}  how many cards to render (default 4)
 *   variant  {'hotel'|'flight'|'compact'}  card shape (default 'hotel')
 */
export default function CardSkeleton({ count = 4, variant = 'hotel' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`sk-card sk-card--${variant}`}>
          {variant !== 'compact' && <div className="sk-block sk-image" />}
          <div className="sk-body">
            {variant === 'flight' ? (
              <>
                <div className="sk-row">
                  <div className="sk-block sk-logo" />
                  <div className="sk-stack" style={{ flex: 1 }}>
                    <div className="sk-block sk-line" style={{ width: '60%' }} />
                    <div className="sk-block sk-line sk-line--sm" style={{ width: '40%' }} />
                  </div>
                  <div className="sk-block sk-price" />
                </div>
                <div className="sk-block sk-line sk-line--sm" style={{ width: '80%', marginTop: 10 }} />
                <div className="sk-row" style={{ marginTop: 12 }}>
                  <div className="sk-block sk-badge" />
                  <div className="sk-block sk-badge" />
                  <div className="sk-block sk-btn-sm" style={{ marginLeft: 'auto' }} />
                </div>
              </>
            ) : (
              <>
                <div className="sk-block sk-line" style={{ width: '75%' }} />
                <div className="sk-block sk-line sk-line--sm" style={{ width: '50%' }} />
                <div className="sk-row" style={{ marginTop: 10 }}>
                  <div className="sk-block sk-badge" />
                  <div className="sk-block sk-badge" />
                </div>
                <div className="sk-row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
                  <div className="sk-block sk-price" />
                  <div className="sk-block sk-btn-sm" />
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
