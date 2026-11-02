module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Embute no bundle só as variáveis listadas (o resto do ambiente nunca entra no app).
    // VOZTRI_API_URL: endereço da API (ex.: aparelho físico); sem ela, o padrão do
    // @voztri/mobile-core (10.0.2.2 no emulador Android, localhost no iOS).
    // Ao mudar o valor, reinicie o Metro com --reset-cache (o Babel guarda o resultado).
    ['transform-inline-environment-variables', { include: ['VOZTRI_API_URL'] }],
  ],
};
