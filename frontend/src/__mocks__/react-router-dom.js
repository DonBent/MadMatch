import React from 'react';

const mockNavigate = jest.fn();
const mockUseParams = jest.fn();
const mockUseLocation = jest.fn();

// Set default implementations
mockUseParams.mockImplementation(() => ({ id: '1' }));
mockUseLocation.mockImplementation(() => ({ pathname: '/' }));

export const BrowserRouter = ({ children }) => <div>{children}</div>;
export const Routes = ({ children }) => <div>{React.Children.toArray(children)[0]}</div>;
export const Route = ({ element }) => <div>{element}</div>;
export const Link = ({ to, children, className }) => (
  <a href={to} className={className}>{children}</a>
);
export const useNavigate = jest.fn(() => mockNavigate);
export const useParams = mockUseParams;
export const useLocation = jest.fn(() => ({ pathname: '/' }));

export const __setMockParams = (params) => {
  mockUseParams.mockReturnValue(params);
};

export const __setMockLocation = (location) => {
  mockUseLocation.mockReturnValue(location);
};

export const __resetMocks = () => {
  mockNavigate.mockClear();
  mockUseParams.mockClear();
  mockUseLocation.mockClear();
  mockUseParams.mockImplementation(() => ({ id: '1' })); // Restore default
  mockUseLocation.mockImplementation(() => ({ pathname: '/' })); // Restore default
};
