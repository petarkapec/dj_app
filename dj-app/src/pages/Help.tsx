import React from 'react';
import './help.css';
import { useNavigate } from 'react-router-dom';

const Help: React.FC = () => {
    const navigate = useNavigate();
  return (
    <div className="load-screen">
    <div className="container">
      <h1>Pomoć: Kako naručiti pjesmu?</h1>
      <p>Sljedeći postupak vodi vas kroz korake kako naručiti pjesmu:</p>
      <ol>
        <li>Odaberite koliko novaca želite donirati vašem izvođaču.</li>
        <li>Što više novaca odaberete, veća je šansa da će izvođač prihvatiti pjesmu. :)</li>
        <li>Nakon odabira iznosa, zahtjev se šalje izvođaču na pregled.</li>
        <li>Kada izvođač prihvati zahtjev, otvara se opcija za plaćanje (Apple Pay, Google Pay ili kartice).</li>
        <li>Nakon uspješnog plaćanja, izvođač pušta pjesmu.</li>
        <li>P.S. Za vidjeti google pay otvorite na google chrome-u, za vidjeti apple pay otvoriti na safari-ju</li>
      </ol>
    </div>
    <button onClick={() => navigate("/")}>Povratak</button>
    </div>
  );
}

export default Help;
