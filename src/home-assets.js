import avatarPoster from "../assets/home/hero-portrait-poster.jpg";
import avatar from "../assets/home/hero-portrait.mp4";
import artifact from "../assets/home/artifact-screen-source30.mp4";
import artifactStill from "../assets/home/artifact-screen-static.png";
import aiProducer from "../assets/home/ai-producer-screen-web.mp4";
import aiProducerPoster from "../assets/home/ai-producer-screen-poster.jpg";
import tayaPoster from "../assets/home/taya-poster.jpg";
import taya from "../assets/home/taya-screen-web.mp4";
import arrow from "../assets/home/figma/figma-home-arrow-24.svg";
import phone from "../assets/home/figma/figma-home-iphone.png";
import browserTitle from "../assets/home/figma/figma-home-browser-titlebar@2x.webp";
import shotWide from "../assets/home/figma/figma-home-shot-wide@2x.webp";
import shotPortraitA from "../assets/home/figma/figma-home-shot-portrait-a@2x.webp";
import shotPortraitB from "../assets/home/figma/figma-home-shot-portrait-b@2x.webp";
import shotUI from "../assets/home/figma/figma-home-shot-ui@2x.webp";
import collage from "../assets/home/figma/figma-home-about-collage.png";
import portrait from "../assets/home/about/portrait.jpg";

export const homeAssets = {
  avatar, avatarPoster, artifact, artifactStill, aiProducer, aiProducerPoster, taya, tayaPoster, arrow, phone,
  browserTitle, shotWide, shotPortraitA, shotPortraitB, shotUI,
  collage, portrait,
};

export const aboutVideos = import.meta.glob("../assets/home/about/*.mp4", {
  eager: true,
  query: "?url",
  import: "default",
});

export const aboutPosters = import.meta.glob("../assets/home/about/*-poster.jpg", {
  eager: true,
  query: "?url",
  import: "default",
});
