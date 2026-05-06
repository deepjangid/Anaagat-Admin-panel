import React from 'react';
import { Button, Result } from 'antd';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary caught an error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle="The admin panel hit an unexpected error. Reload to recover safely."
            extra={
              <Button type="primary" onClick={this.handleReload}>
                Reload Admin Panel
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
