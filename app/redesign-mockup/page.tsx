
import React from 'react';
import '../../styles/redesign-mockup.css';

const RedesignMockupPage = () => {
  return (
    <div className="mockup-body">
      <header className="mockup-header">
        <div className="mockup-logo">The Urban Manual</div>
        <nav className="mockup-nav">
          <a href="#">Destinations</a>
          <a href="#">AI Assistant</a>
          <a href="#">Account</a>
        </nav>
      </header>
      <main className="mockup-main">
        <div className="mockup-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div className="mockup-card" key={i}>
              <img
                src={`https://source.unsplash.com/random/400x300?city,${i}`}
                alt="Destination"
                className="mockup-card-image"
              />
              <div className="mockup-card-content">
                <h3 className="mockup-card-title">Destination Name</h3>
                <p className="mockup-card-meta">City, Country</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default RedesignMockupPage;
