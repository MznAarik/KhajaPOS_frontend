'use client';

import {
  FlipCard,
} from '@/components/animate-ui/components/community/flip-card';



export const FlipCardDemo = () => {
  const data = {
    name: 'Chowmein',
    username: 'chowmein',
    image:
      'https://img.freepik.com/free-photo/closeup-shot-beautiful-butterfly-with-interesting-textures-orange-petaled-flower_181624-7640.jpg?semt=ais_hybrid&w=740&q=80',
    bio: 'A fully animated, open-source component distribution built with React, TypeScript, Tailwind CSS, and Motion.',
    stats: { following: 200, followers: 2900, posts: 120 },
    socialLinks: {
      linkedin: 'https://linkedin.com',
      github: 'https://github.com',
      twitter: 'https://twitter.com',
    },
  };
  return <FlipCard data={data} />;
};
