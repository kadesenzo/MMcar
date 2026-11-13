import React from 'react';
import { MMCarLogo, MMCarLogoProps } from './MMCarLogo';

export type KaenLogoProps = MMCarLogoProps;

export const KaenLogo: React.FC<KaenLogoProps> = (props) => {
  return <MMCarLogo {...props} />;
};

export default KaenLogo;
