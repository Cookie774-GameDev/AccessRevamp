import React from 'react';
import {Composition} from 'remotion';
import {AccessRevampPromo} from './AccessRevampPromo';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="AccessRevampPromo"
    component={AccessRevampPromo}
    durationInFrames={900}
    fps={30}
    width={2560}
    height={1440}
  />
);
