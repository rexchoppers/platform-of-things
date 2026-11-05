import childhoodImage from '../assets/childhood.png';
import javaImage from '../assets/java.svg';
import image2014 from '../assets/2014.jpg';
import image2016 from '../assets/2016.png';
import image2017 from '../assets/2017.jpeg';
import image2019 from '../assets/2019.jpg';
import image2020 from '../assets/2020.svg';
import image2022 from '../assets/2022.jpg';
import image2025 from '../assets/2025.jpeg';

export interface Slide {
  title: string;
  text: string;
  image?: string;
  isIntro?: boolean; // Intro slides don't count toward the slide number
}

export const slides: Slide[] = [
  { title: 'My Journey', text: 'Press E at the projector to start.', isIntro: true },
  { title: '1999', text: 'This is where it all started.', image: childhoodImage },
  {
    title: '2012',
    text: 'Wrote my first lines of code. Java for game mods, plus learning sysadmin along the way.',
    image: javaImage,
  },
  {
    title: '2014',
    text: 'Discovered web development. Started building side projects and taking on small client work.',
    image: image2014,
  },
  {
    title: '2016',
    text: 'Moved into mobile app development. First internship building a prototype mental health app.',
    image: image2016,
  },
  { title: '2017', text: 'Started a Software Development Apprenticeship at 3PL.', image: image2017 },
  {
    title: '2019',
    text: 'Completed my apprenticeship. Joined Orka Technology Group, later promoted to Senior Software Engineer.',
    image: image2019,
  },
  { title: '2020', text: 'Started a part-time BSc Computing + IT degree at The Open University.', image: image2020 },
  { title: '2022', text: 'Joined Papertrail as Technical Lead.', image: image2022 },
  { title: '2025', text: 'Joined LocalStack as Senior Full-Stack Engineer.', image: image2025 },
  { title: '2026', text: '14 years programming. 9 years professionally. To be continued...' },
];
