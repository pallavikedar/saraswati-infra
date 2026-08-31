// components/map/MapHeader.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

import prospera from '../../assets/logo.jpeg';
import infra from '../../assets/map-logo.jpeg';
import '../../styles/home.css';

export default function MapHeader({ onBack }) {
  const navigate = useNavigate();
  const back = onBack || (() => navigate("/"));

  return (
    <div className="mh">
      <button type="button" className="mh-back" onClick={back} aria-label="Back">
        ‹
      </button>
      <div className="mh-logos">
        <img src={prospera} alt="Prospera Saraswati" className="mh-logo" />
        <span className="mh-rule" />
        <img src={infra} alt="Saraswati Infra" className="mh-logo" />
      </div>
    </div>
  );
}