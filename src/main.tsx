import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import PublicLobby from './PublicLobby';
import './styles.css';
import './styles-v02.css';
import './sceneLabels.css';
const isLobby=window.location.pathname.replace(/\/+$/,'')==='/lobby';
createRoot(document.getElementById('root')!).render(<React.StrictMode>{isLobby?<PublicLobby/>:<App/>}</React.StrictMode>);
