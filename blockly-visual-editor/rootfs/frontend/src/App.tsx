import React from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import BlocklyEditor from './components/BlocklyEditor/BlocklyEditor';
import DebugPanel from './components/DebugPanel/DebugPanel';
import ScriptHeader from './components/ScriptHeader/ScriptHeader';
import Toolbar from './components/Toolbar/Toolbar';
import { Layout, Model, TabNode, IJsonModel, IBorderLocation } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';

const layoutModel: IJsonModel = {
  global: {},
  borders: [
    {
      type: 'border',
      location: 'left' as IBorderLocation,
      size: 300,
      children: [
        {
          type: 'tab',
          name: 'Scripts',
          component: 'Sidebar',
          enableClose: false,
          enableDrag: false
        }
      ]
    },
    {
      type: 'border',
      location: 'bottom' as IBorderLocation,
      children: [
        {
          type: 'tab',
          name: 'Debug',
          component: 'DebugPanel',
          enableClose: false
        }
      ]
    }
  ],
  layout: {
    type: 'row',
    children: [
      {
        type: 'column',
        weight: 100,
        children: [
          {
            type: 'tabset',
            weight: 80,
            children: [
              { type: 'tab', name: 'Blockly', component: 'BlocklyEditor' }
            ]
          }
        ]
      }
    ]
  }
};

const model = Model.fromJson(layoutModel);

const factory = (node: TabNode) => {
  const component = node.getComponent();
  if (component === 'Sidebar') return <Sidebar />;
  if (component === 'BlocklyEditor') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ScriptHeader />
      <Toolbar onDebug={() => {}} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <BlocklyEditor />
      </div>
    </div>
  );
  if (component === 'DebugPanel') return <DebugPanel open={true} onClose={() => {}} />;
  return null;
};

const App: React.FC = () => {
  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Layout model={model} factory={factory} />
    </div>
  );
};

export default App;
