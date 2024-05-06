import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CornerstoneComponent from './components/Cornerstone.jsx';
import './index.css'
import './transitions.css';

import { runFunction } from './main.js';


ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

// ReactDOM.createRoot(document.getElementById('root')).render(
// 	<React.StrictMode>
// 		<CornerstoneComponent />
// 	</React.StrictMode>,
// )

// runFunction();
