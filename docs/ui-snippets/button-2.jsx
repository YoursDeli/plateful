// Original snippet as supplied by the client (2026-09-29), labelled "Button 2".
// Kept verbatim for reference — the adapted component lives in /components/ui/.
import React from 'react';
import styled from 'styled-components';

const Button = () => {
  return (
    <StyledWrapper>
      <button>Click me!</button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  button {
    padding: 15px 25px;
    border: 0;
    border-radius: 15px;
    color: #212121;
    z-index: 1;
    background: #e8e8e8;
    position: relative;
    font-weight: 1000;
    font-size: 17px;
    -webkit-box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    transition: all 250ms;
    overflow: hidden;
  }

  button::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    height: 0;
    width: 0;
    border-radius: 15px;
    background-color: #212121;
    z-index: -1;
    -webkit-box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.27);
    transition: all 250ms;
  }

  button:hover {
    color: #e8e8e8;
  }

  button:hover::before {
    width: 100%;
    top: 0;
    left: 0;
    height: 100%;
  }

  button:active {
    transform: scale(80%);
  }`;

export default Button;
