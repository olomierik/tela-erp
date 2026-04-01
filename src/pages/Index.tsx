import { Navigate } from 'react-router-dom';

// Redirect index to the main landing page
export default function Index() {
  return <Navigate to="/" replace />;
}
