import * as soundworks from 'soundworks/client';
import PlayerExperience from './PlayerExperience';
import serviceViews from '../shared/serviceViews';

function bootstrap() {
  document.body.classList.remove('loading');
  const config = Object.assign({ appContainer: '#container' }, window.soundworksConfig);

  soundworks.client.init(config.clientType, config);
  soundworks.client.setServiceInstanciationHook((id, instance) => {
    if (serviceViews.has(id))
      instance.view = serviceViews.get(id, config);
  });

  const experience = new PlayerExperience(config.assetsDomain);
  soundworks.client.start();
}

window.addEventListener('load', bootstrap);
