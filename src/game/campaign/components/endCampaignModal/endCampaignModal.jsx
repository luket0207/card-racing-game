import { useGame } from "../../../../engine/gameContext/gameContext";
import "./endCampaignModal.scss";

const EndCampaignModal = () => {
  const { gameState } = useGame();
  const points = gameState?.campaign?.points ?? 0;
  return (
    <div className="end-campaign">
      <h2>Campaign Complete</h2>
      <p>Your campaign has ended. Thanks for playing.</p>
      <p>Final Points: {points}</p>
    </div>
  );
};

export default EndCampaignModal;
