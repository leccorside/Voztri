// Só para os testes do pacote (Jest). No app, quem transforma este código é o Babel do
// app (driver-mobile / passenger-mobile), que também embute o VOZTRI_API_URL.
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
