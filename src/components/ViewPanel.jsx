import { runFunction } from '../main.js';

function ViewPanel() {
  return (
    <div id="viewPanel" className="flex text-center gap-2 h-my-2 flex-grow">
        <div id="volumeContent" className="rounded-lg border-2 dark:border-gray-600 border-gray-100 w-1/3 flex flex-col justify-center items-center"><p>Coronal View</p></div>
        <div id="mipContent" className="rounded-lg border-2 dark:border-gray-600 border-gray-100 w-1/3 flex flex-col justify-center items-center mr-1 ml-1"><p>Sagittal View</p></div>
        <div id="t3dContent" className="rounded-lg border-2 dark:border-gray-600 border-gray-100 w-1/3 flex flex-col justify-center items-center"><p>3D View</p></div>
      </div>
  );
}

// runFunction();

export default ViewPanel;
