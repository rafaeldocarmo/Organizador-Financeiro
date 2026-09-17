import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desliga o streaming de metadata: sem isso o Next 16 insere placeholders
  // <div hidden> que chegam depois do shell inicial e, no dev/HMR, colidem com
  // espaço em branco e disparam "Hydration failed" + erro de removeChild.
  //
  // O workaround é de desenvolvimento, então fica restrito a ele — antes valia
  // para todo user-agent (`/.*/`) e penalizava o carregamento em produção.
  // Se o erro voltar em produção, o culpado é isto.
  ...(process.env.NODE_ENV === 'development' ? { htmlLimitedBots: /.*/ } : {}),
};

export default nextConfig;
