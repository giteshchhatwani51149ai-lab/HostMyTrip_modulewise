import React from 'react';
import './skeletons.css';

/**
 * FormSkeleton — pulse-animated placeholder for forms.
 *
 * Props:
 *   fields   {number}   number of label+input pairs (default 4)
 *   columns  {1|2}      1 or 2 column layout (default 1)
 *   showButton {boolean} show a submit button skeleton (default true)
 */
export default function FormSkeleton({ fields = 4, columns = 1, showButton = true }) {
  return (
    <div className="sk-form">
      <div className={`sk-form-grid sk-form-grid--${columns}col`}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="sk-form-field">
            <div className="sk-block sk-label" />
            <div className="sk-block sk-input" />
          </div>
        ))}
      </div>

      {showButton && (
        <div className="sk-form-footer">
          <div className="sk-block sk-btn" />
        </div>
      )}
    </div>
  );
}
