import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="card">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message || "An unexpected error occurred."}</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
