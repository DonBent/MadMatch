import { render, screen } from '@testing-library/react';
import App from './App';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default'
  }),
  useParams: () => ({}),
  useNavigate: () => jest.fn()
}));

// Mock the tilbudService
jest.mock('./services/tilbudService', () => ({
  tilbudService: {
    getAllTilbud: jest.fn(() => Promise.resolve([
      {
        id: 1,
        navn: 'Test Produkt',
        butik: 'Test Butik',
        kategori: 'Test',
        normalpris: 100,
        tilbudspris: 50,
        rabat: 50
      }
    ])),
    getButikker: jest.fn(() => Promise.resolve(['Test Butik'])),
    getKategorier: jest.fn(() => Promise.resolve(['Test']))
  }
}));

// Mock the recipeService
jest.mock('./services/recipeService', () => ({
  recipeService: {
    searchRecipes: jest.fn(() => Promise.resolve({
      recipes: [],
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false
    })),
    getAllRecipes: jest.fn(() => Promise.resolve([]))
  }
}));

test('renders MadMatch header', async () => {
  render(<App />);
  const headerElement = await screen.findByRole('heading', { name: /MadMatch/i });
  expect(headerElement).toBeInTheDocument();
});

test('renders navigation with favorites tab', async () => {
  render(<App />);
  const navElement = await screen.findByTestId('main-navigation');
  expect(navElement).toBeInTheDocument();
  
  // Check for favorites link
  const favoritesLink = await screen.findByTestId('nav-favoritter');
  expect(favoritesLink).toBeInTheDocument();
});
