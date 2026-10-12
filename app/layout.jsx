import './globals.css';
import ToastContainer from '../components/ToastContainer';

export const metadata = {
  title: 'Consejo Comunal Las Llaves | Portal y Gestión Documental',
  description: 'Sistema oficial de gestión comunal, emisión de cartas de residencia, constancias de buena conducta y validación digital con código QR.',
  keywords: 'Consejo Comunal Las Llaves, Puerto Cabello, Carta de Residencia, Buena Conducta, SITUR 08-11-04-001-0033',
  icons: {
    icon: 'https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="icon" href="https://pub-655532e909a84173b724499ba0ea6f8c.r2.dev/web/img/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#090d16" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('cc_theme');
                if (saved === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <ToastContainer />
        {children}
      </body>
    </html>
  );
}
