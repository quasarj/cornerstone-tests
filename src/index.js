import React from 'react'
import ReactDOM from 'react-dom/client'
import {
	createBrowserRouter,
	RouterProvider,
} from 'react-router-dom';

import './index.css'
import './transitions.css';

import Home from './routes/home';
import MaskIEC, {
	loader as iecLoader,
} from './routes/mask/iec';

import MaskVR, {
	loader as vrLoader,
} from './routes/mask/vr';

const router = createBrowserRouter([
	{
		path: "/",
		element: <Home />,
	},
	{
		path: "mask/iec/:iec",
		element: <MaskIEC />,
		loader: iecLoader,
	},
	{
		path: "mask/vr/:visual_review_instance_id",
		element: <MaskVR />,
		loader: vrLoader,
	},
], {
	basename: "/mira",
});

const root = ReactDOM.createRoot(document.getElementById('root'));

// Not currently working in StrictMode for some reason, investigate?
// root.render(
// 	<React.StrictMode>
// 		<RouterProvider router={router} />
// 	</React.StrictMode>
// );
//
root.render(
		<RouterProvider router={router} />
);
