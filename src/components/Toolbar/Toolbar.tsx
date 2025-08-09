import { useAtom } from '@reatom/npm-react';
import { Button, Tooltip, Flex } from '@radix-ui/themes';
import { CursorArrowIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { useHotkeys } from 'react-hotkeys-hook';

import { activeTool, type Tool } from '@/stores';

import css from './Toolbar.module.scss';

export const Toolbar = () => {
  const [tool, setTool] = useAtom(activeTool);

  const handleToolChange = (newTool: Tool) => {
    setTool(newTool);
  };

  // Горячие клавиши для инструментов
  useHotkeys('h', () => handleToolChange('hand'));
  useHotkeys('i', () => handleToolChange('eyedropper'));

  return (
    <div className={css.Toolbar}>
      <Flex gap="2" align="center">
        <Tooltip content="Инструмент Рука (H) - перемещение изображения">
          <Button
            variant={tool === 'hand' ? 'solid' : 'outline'}
            size="2"
            onClick={() => handleToolChange('hand')}
            className={css.ToolButton}
          >
            <CursorArrowIcon />
          </Button>
        </Tooltip>

        <Tooltip content="Инструмент Пипетка (I) - выбор цвета">
          <Button
            variant={tool === 'eyedropper' ? 'solid' : 'outline'}
            size="2"
            onClick={() => handleToolChange('eyedropper')}
            className={css.ToolButton}
          >
            <EyeOpenIcon />
          </Button>
        </Tooltip>
      </Flex>
    </div>
  );
};
