import { Theme } from '@radix-ui/themes';
import { CanvasContainer } from '@/components/CanvasContainer';

export const App = () => {
  return (
    <Theme>
      <div className="app">
        <CanvasContainer />
      </div>
    </Theme>
  );
};
