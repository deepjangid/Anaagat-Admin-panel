import Jobs from './Jobs';
import { openingsAPI } from '../services/api';

const Openings = () => (
  <Jobs
    pageTitle="Openings"
    addButtonLabel="Add Opening"
    api={openingsAPI}
    entityLabel="Opening"
    allowDeleteAll
    includeClientId={false}
  />
);

export default Openings;
