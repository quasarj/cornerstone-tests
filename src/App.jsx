import { useState } from 'react';

import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import MiddlePanel from './components/MiddlePanel';
import RightPanel from './components/RightPanel';
import TopPanel from './components/TopPanel';

function App() {
  const [leftPanelVisibility, setLeftPanelVisibility] = useState(true);
  const [rightPanelVisibility, setRightPanelVisibility] = useState(true);
  const [topPanelVisibility, setTopPanelVisibility] = useState(true);

  const gridTemplate = leftPanelVisibility && rightPanelVisibility
    ? 'grid-cols-[auto,1fr,auto]'
    : leftPanelVisibility 
    ? 'grid-cols-[auto,1fr]'
    : rightPanelVisibility 
    ? 'grid-cols-[1fr,auto]'
    : 'grid-cols-1';
  
  return (
    <div id="app" className={`grid ${topPanelVisibility ? 'grid-rows-[auto,auto,1fr]' : 'grid-rows-[1fr]'} gap-2 w-screen h-screen p-2`}>
      {topPanelVisibility && <Header />}
      {topPanelVisibility && <TopPanel />}
      <div id="main" className={`h-full grid ${gridTemplate} rounded-lg gap-2 overflow-hidden`}>
        {leftPanelVisibility && (
          <div id="leftPanel" className="w-72 h-full rounded-lg overflow-y-hidden">
            <LeftPanel />
          </div>
        )}
        <MiddlePanel
          leftPanelVisibility={leftPanelVisibility} 
          setLeftPanelVisibility={setLeftPanelVisibility} 
          rightPanelVisibility={rightPanelVisibility} 
          setRightPanelVisibility={setRightPanelVisibility}
          topPanelVisibility={topPanelVisibility} 
          setTopPanelVisibility={setTopPanelVisibility}
        />
        {rightPanelVisibility && (
          <div id="rightPanel" className="w-72 h-full rounded-lg overflow-hidden">
            <RightPanel />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
