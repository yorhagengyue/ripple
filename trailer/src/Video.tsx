import {Composition} from 'remotion';
import {BestQualities} from './BestQualities';
import {CodeFrame} from './CodeFrame';
import {EndCard} from './EndCard';
import {FastRefreshDemo} from './FastRefreshDemo';
import {Fork} from './Fork';
import {GoToGithub} from './GoToGithub';
import {Howto} from './HowTo';
import {InspectAndRefactor} from './InspectAndRefactor';
import {Install} from './Install';
import {Intro} from './Intro/Intro';
import {Logo} from './Logo/Logo';
import {Main} from './Main';
import {Multithreaded} from './MultiThreaded';
import {OpenSource} from './OpenSource';
import {Pricing} from './Pricing';
import {PullRequest} from './PullRequest';
import {RemotionPlayerDemo} from './RemotionPlayerDemo';
import {RippleArchitecture} from './RippleArchitecture';
import {RippleCall} from './RippleCall';
import {RippleClose} from './RippleClose';
import {RippleImpactClinical} from './RippleImpactClinical';
import {RippleImpactEnterprise} from './RippleImpactEnterprise';
import {RippleImpactNational} from './RippleImpactNational';
import {RippleInstall} from './RippleInstall';
import {RippleIntro} from './RippleIntro';
import {RippleMCPServer} from './RippleMCPServer';
import {RippleProblem} from './RippleProblem';
import {RippleSiteTour} from './RippleSiteTour';
import {RippleTitle} from './RippleTitle';
import {RippleToolsList} from './RippleToolsList';
import {RippleWorkatoRecipe} from './RippleWorkatoRecipe';
import {RippleWorkatoRecipes} from './RippleWorkatoRecipes';
import {Ssr} from './SSRMultithreaded';
import {TerminalRender} from './TerminalRender';
import {Trailer} from './Trailer';
import {Website} from './Website';
import {WebTechnologies} from './WebTechnologies';

export const RemotionVideo: React.FC = () => {
	return (
		<>
			<Composition
				id="Main"
				component={Main}
				durationInFrames={2934}
				fps={30}
				width={1920}
				height={1080}
				defaultProps={{
					titleText: 'Welcome to Remotion',
					titleColor: 'black',
				}}
			/>
			<Composition
				id="WebTechnologies"
				component={WebTechnologies}
				durationInFrames={1.5 * 30}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="CodeFrame"
				component={CodeFrame}
				durationInFrames={3 * 30}
				fps={30}
				width={1920}
				height={1080}
				defaultProps={{
					width: 1200,
					code: `
export const RemotionVideo = () => {
	return (
		<Composition
			id="CodeFrame"
			component={CodeFrame}
			durationInFrames={3 * 30}
			fps={30}
			width={1920}
			height={1080}
		/>
	);
}

					`.trim(),
					timing: [
						{
							line: 6,
							from: 0,
						},
					],
					title: 'Video.tsx',
				}}
			/>
			<Composition
				id="RemotionPlayerDemo"
				component={RemotionPlayerDemo}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={7 * 30}
			/>
			<Composition
				id="FastRefreshDemo"
				component={FastRefreshDemo}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={7 * 30}
			/>
			<Composition
				id="Intro"
				component={Intro}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={4 * 30}
				defaultProps={{
					offset: 0,
					showText: true,
				}}
			/>
			<Composition
				component={Logo}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={6 * 30}
				id="Logo"
				defaultProps={{
					showText: true,
					textStartOffset: 0,
					offset: 0,
				}}
			/>
			<Composition
				component={GoToGithub}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={6 * 30}
				id="GoToGithub"
			/>
			<Composition
				component={Fork}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={6 * 30}
				id="Fork"
			/>
			<Composition
				component={InspectAndRefactor}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={6 * 30}
				id="Inspect"
			/>
			<Composition
				component={PullRequest}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={6 * 30}
				id="PullRequest"
			/>
			<Composition
				component={Howto}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={6 * 30}
				id="Howto"
			/>
			<Composition
				component={TerminalRender}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={6 * 30}
				id="TerminalRender"
			/>
			<Composition
				component={Ssr}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={6 * 30}
				id="SSR"
			/>
			<Composition
				component={Multithreaded}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={6 * 30}
				id="Multithreaded"
			/>
			<Composition
				component={BestQualities}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={4 * 30}
				id="BestQualities"
			/>
			<Composition
				component={Pricing}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={4 * 30}
				id="Pricing"
			/>
			<Composition
				component={OpenSource}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={4 * 30}
				id="OpenSource"
			/>
			<Composition
				component={Install}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={2 * 30}
				id="Install"
			/>
			<Composition
				component={Website}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={2 * 30}
				id="Website"
			/>
			<Composition
				component={EndCard}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={2 * 30}
				id="EndCard"
			/>

			<Composition
				component={Trailer}
				width={1920}
				height={1080}
				fps={30}
				durationInFrames={315}
				id="Trailer"
			/>

			{/* ===== Ripple NAISC demo scenes (v2 · 4min narration cut) ===== */}
			<Composition
				id="RippleIntro"
				component={RippleIntro}
				durationInFrames={390}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleProblem"
				component={RippleProblem}
				durationInFrames={630}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleTitle"
				component={RippleTitle}
				durationInFrames={840}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleArchitecture"
				component={RippleArchitecture}
				durationInFrames={900}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleWorkatoRecipes"
				component={RippleWorkatoRecipes}
				durationInFrames={240}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleWorkatoRecipe"
				component={RippleWorkatoRecipe}
				durationInFrames={750}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleMCPServer"
				component={RippleMCPServer}
				durationInFrames={900}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleInstall"
				component={RippleInstall}
				durationInFrames={450}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleToolsList"
				component={RippleToolsList}
				durationInFrames={360}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleCall"
				component={RippleCall}
				durationInFrames={780}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleSiteTour"
				component={RippleSiteTour}
				durationInFrames={660}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleImpactClinical"
				component={RippleImpactClinical}
				durationInFrames={540}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleImpactEnterprise"
				component={RippleImpactEnterprise}
				durationInFrames={540}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleImpactNational"
				component={RippleImpactNational}
				durationInFrames={540}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="RippleClose"
				component={RippleClose}
				durationInFrames={540}
				fps={30}
				width={1920}
				height={1080}
			/>
		</>
	);
};
