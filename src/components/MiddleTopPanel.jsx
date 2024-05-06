import EditViewPanel from "./EditViewPanel";
import NavigationPanel from "./NavigationPanel";

function MiddleTopPanel() {
  return (
    <div id="middleTopPanel" className="w-full flex justify-between items-center">
        <NavigationPanel />
        <EditViewPanel />
      </div>
  );
}

export default MiddleTopPanel;