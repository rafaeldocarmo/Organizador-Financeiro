import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      // Código gerado pelo Prisma — não é nosso e é enorme.
      'lib/generated/**',
      // Service worker: roda em escopo de worker, não no bundle do Next.
      'public/sw.js',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Nomes descartados por convenção (_e, _req) não são erro.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Aviso, não erro. A regra é nova e pega o padrão "carregar dados num
      // useEffect", que é como as telas que ainda não migraram para useFetch
      // funcionam — e pega também o próprio lib/use-fetch.ts, onde marcar o
      // estado inicial dentro do efeito é o comportamento correto de um SWR.
      // Vira 'error' quando a migração de PER-4 terminar.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
