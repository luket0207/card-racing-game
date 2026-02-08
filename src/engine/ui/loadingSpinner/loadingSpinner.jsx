import "./loadingSpinner.scss";

const LoadingSpinner = ({ size = 32 }) => (
  <span className="loading-spinner" style={{ width: size, height: size }} aria-label="Loading" />
);

export default LoadingSpinner;
