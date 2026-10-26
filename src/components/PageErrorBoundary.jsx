import React from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button, Card, EmptyState } from './ui';

export default class PageErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <Card><EmptyState icon={TriangleAlert} title="This page could not open" description="Reload to get the latest version, or use the navigation to open another page." action={<Button icon={RefreshCw} onClick={() => window.location.reload()}>Reload workspace</Button>} /></Card>;
    }
    return this.props.children;
  }
}
