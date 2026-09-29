// Client-supplied "Liquid" button (2026-09-29). Reference only — the site's
// adapted version is components/ui/liquid-button.tsx.
import React from 'react';
import styled from 'styled-components';

const Button = () => {
  return (
    <StyledWrapper>
      <div>
        <button className="loader">
          <div className="loader-bg">
            <span>Liquid</span>
          </div>
          <div className="drops">
            <div className="drop1" />
            <div className="drop2" />
            <div className="drop3" />
          </div>
        </button>
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="liquid">
              <feGaussianBlur result="blur" stdDeviation={10} in="SourceGraphic" />
              <feColorMatrix result="liquid" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" mode="matrix" in="blur" />
            </filter>
          </defs>
        </svg>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  @keyframes fade-in {
    0% { opacity: 0; transform: scale(0.5); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes jump-scare {
    0% { transform: scale(1) rotate(0deg); opacity: 1; }
    50% { transform: scale(1.5) rotate(10deg); opacity: 1; }
    100% { transform: scale(0.9) rotate(-5deg); opacity: 1; }
  }
  @keyframes drop {
    0% { bottom: 0px; opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 1; bottom: -400px; }
  }
  .loader { text-align: center; font-size: 16px; display: flex; justify-content: center; width: 100%; position: relative; border: none; cursor: pointer; margin-left: 20%; background-color: transparent; }
  .loader-bg { border-radius: 12px; padding: 10px 15px; z-index: 2; width: 120px; color: #fff; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; background-color: black; background-image: radial-gradient(circle 80px at 50% 150%, #2a2a2a, black); margin-bottom: 10px; transition: all 0.2s ease-in-out; }
  .loader-bg:hover { text-shadow: 0px 0px 8px #fff; animation: jump-scare 0.2s ease-in-out; }
  .loader-bg:active { background-image: radial-gradient(circle 140px at 50% 150%, #2a2a2a, black); }
  .loader-bg:hover + .drops .drop2, .drop3 { animation: drop 0.5s cubic-bezier(1, 0.19, 0.66, 0.12) 0.1s infinite; }
  .loader-bg:active + .drops .drop1, .drop2, .drop3 { background-color: #fff; }
  .drops { filter: url("#liquid"); position: absolute; top: 35%; left: 0; bottom: 0; right: 0; z-index: 1; opacity: 0; animation: fade-in 0.3s linear 0.2s forwards; }
  .drop1, .drop2, .drop3 { width: 20px; height: 28px; border-radius: 50%; position: absolute; left: 0; right: 0; top: 0; margin: auto; background-color: black; }
  .drop1 { width: 125px; height: 16px; bottom: 2px; border-radius: 0; }
  .drop3 { background-color: white; }
  .drop2, .drop3 { animation: drop 1.5s cubic-bezier(1, 0.19, 0.66, 0.12) 0.7s infinite; }`;

export default Button;
