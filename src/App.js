import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Analytics } from '@vercel/analytics/react';
import NFTGrid from './components/NFTGrid';

// Brand theme: no MUI blue, no Roboto. Accent #f5c542, background #0b0b0c.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#f5c542', contrastText: '#0b0b0c' },
    background: { default: '#0b0b0c', paper: '#0b0b0c' },
  },
  typography: {
    fontFamily: "'Barlow', ui-sans-serif, system-ui, sans-serif",
    button: {
      fontFamily: "'Saira', ui-sans-serif, system-ui, sans-serif",
      fontWeight: 600,
      letterSpacing: '0.1em',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <NFTGrid />
        <Analytics />
      </div>
    </ThemeProvider>
  );
}

export default App;
