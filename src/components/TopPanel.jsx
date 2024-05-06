import SearchPanel from "./SearchPanel";

function TopPanel() {
  return (
    <div id="topPanel" className="flex rounded-lg dark:bg-opacity-5 bg-gray-100 p-2">
      <SearchPanel />
    </div>
  );
}

export default TopPanel;