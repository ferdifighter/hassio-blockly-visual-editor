declare module 'react-split-pane' {
  import * as React from 'react';
  export interface SplitPaneProps {
    split?: 'vertical' | 'horizontal';
    minSize?: number;
    maxSize?: number;
    size?: number;
    defaultSize?: number;
    onChange?: (size: number) => void;
    resizerStyle?: React.CSSProperties;
    paneStyle?: React.CSSProperties;
    children?: React.ReactNode;
  }
  export default class SplitPane extends React.Component<SplitPaneProps> {}
} 