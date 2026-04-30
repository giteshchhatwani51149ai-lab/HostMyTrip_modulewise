import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PassengerForm from '../components/booking/PassengerForm';
import { Plane, ArrowLeft } from 'lucide-react';
import './FlightBooking.css';

export default function FlightBooking() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    if (!state?.flight) {
      navigate('/flights/search', { replace: true });
    }
  }, [state, navigate]);

  if (!state?.flight) return null;

  const { flight, searchParams = {} } = state;
  const adults   = Number(searchParams.adults  || 1);
  const children = Number(searchParams.children || 0);
  const infants  = Number(searchParams.infants  || 0);

  const isInternational = flight.from !== flight.to &&
    !['BOM','DEL','BLR','MAA','CCU','HYD','AMD','PNQ','COK','GOI','JAI','LKO','IXC','BHO','PAT','GAU','IXR','VNS'].includes(flight.to);

  const fmtDate = (str) => {
    if (!str) return '';
    return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  };

  const handlePassengersSubmit = (passengers) => {
    navigate('/flights/confirm', {
      state: { flight, passengers, searchParams },
    });
  };

  return (
    <div className="fb-page">
      <Navbar />

      {/* Flight summary bar */}
      <div className="fb-summary-bar">
        <div className="container fb-summary-inner">
          <button className="fb-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16}/> Back
          </button>

          <div className="fb-flight-pill">
            <img
              src={`https://pics.avs.io/40/20/${flight.airlineCode || 'XX'}.png`}
              alt={flight.airline}
              className="fb-airline-logo"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span className="fb-airline-name">{flight.airline}</span>
            <span className="fb-code-badge">{flight.code}</span>
          </div>

          <div className="fb-route">
            <div className="fb-city">
              <span className="fb-time">{flight.dep}</span>
              <span className="fb-iata">{flight.from}</span>
            </div>
            <div className="fb-route-mid">
              <Plane size={14} />
              <span className="fb-dur">{flight.duration}</span>
              <span className="fb-stops">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`}</span>
            </div>
            <div className="fb-city">
              <span className="fb-time">{flight.arr}</span>
              <span className="fb-iata">{flight.to}</span>
            </div>
          </div>

          <div className="fb-date-pax">
            <span>{fmtDate(searchParams.depart)}</span>
            <span>{adults + children + infants} pax</span>
          </div>

          <div className="fb-price-pill">
            ₹{flight.price?.toLocaleString('en-IN')}
            <span className="fb-per-pax">/ person</span>
          </div>
        </div>
      </div>

      {/* Passenger form */}
      <div className="container fb-body">
        <PassengerForm
          passengerCount={{ adults, children, infants }}
          isInternational={isInternational}
          onSubmit={handlePassengersSubmit}
          step={1}
        />
      </div>
    </div>
  );
}
