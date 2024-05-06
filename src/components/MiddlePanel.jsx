import MarkPanel from './MarkPanel';
import MiddleTopPanel from './MiddleTopPanel';
import ViewPanel from './ViewPanel';
import CornerstoneComponent from './Cornerstone';

function MiddlePanel({ leftPanelVisibility, setLeftPanelVisibility, rightPanelVisibility, setRightPanelVisibility, topPanelVisibility, setTopPanelVisibility }) {
  return (
    <div id="middlePanel" className="relative w-full rounded-lg border-4 border-blue-500 p-2 flex flex-col gap-2 overflow-hidden">
      <button
        id="topPanelButton"
        onClick={() => setTopPanelVisibility(!topPanelVisibility)}
        className={`box-content flex items-center justify-center absolute w-5 h-5 leading-5 top-0 left-1/2 transform -translate-x-1/2 bg-blue-500 rounded-full p-1 transition-transform ${topPanelVisibility ? '-translate-y-3 rotate-90' : '-rotate-90 -translate-y-3'}`}
      
      >
        <span className="material-icons rounded-full leading-5 text-white">chevron_left</span>
      </button>
        <button
        id="leftPanelButton"
        onClick={() => setLeftPanelVisibility(!leftPanelVisibility)}
        className={`box-content flex items-center justify-center absolute w-5 h-5 leading-5 top-1/2 left-0 transform -translate-y-1/2 bg-blue-500 rounded-full p-1 transition-transform ${leftPanelVisibility ? '-translate-x-3' : 'rotate-180 -translate-x-3'}`}
      
      >
        <span className="material-icons rounded-full leading-5 text-white">chevron_left</span>
      </button>
      <button
        id="rightPanelButton"
        onClick={() => setRightPanelVisibility(!rightPanelVisibility)}
        className={`box-content flex items-center justify-center absolute w-5 h-5 leading-5 top-1/2 right-0 transform -translate-y-1/2 bg-blue-500 rounded-full p-1 transition-transform ${rightPanelVisibility ? 'translate-x-3' : 'rotate-180 translate-x-3'}`}
      
      >
        <span className="material-icons rounded-full leading-5 text-white">chevron_right</span>
      </button>

      <MiddleTopPanel />
      <CornerstoneComponent />
      <MarkPanel />
    </div>
  );
}

export default MiddlePanel;
