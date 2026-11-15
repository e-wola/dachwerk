<?php
// Copy to config.php and fill in. config.php must never be public in a repository.
return [
  'to'   => 'EMPFAENGER@beispiel.de',   // where enquiries go (client mailbox)
  'from' => 'website@IHRE-DOMAIN.de',   // sender on the hosting domain (SPF/DKIM aligned)
];
