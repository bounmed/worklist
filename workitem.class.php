<?php
//  vim:ts=4:et
/**
 * Workitem
 *
 * @package Workitem
 * @version $Id$
 */
require_once('lib/Workitem/Exception.php');
require_once('lib/twitteroauth/twitteroauth.php');
/**
 * Workitem
 *
 * @package Workitem
 */
class WorkItem {
    protected $id;
    protected $summary;
    protected $creatorId;
    protected $creator;
    protected $runnerId;
    protected $runner;
    protected $mechanicId;
    protected $mechanic;
    protected $status;
    protected $notes;
    protected $sandbox;
    protected $project_id;
    protected $project_name;
    protected $bug_job_id;
    protected $is_bug;

    var $status_changed;

    var $skills = array();

    protected $origStatus = null;

    public function __construct($id = null)
    {
        if (!mysql_connect(DB_SERVER, DB_USER, DB_PASSWORD)) {
            throw new Exception('Error: ' . mysql_error());
        }
        if (!mysql_select_db(DB_NAME)) {
            throw new Exception('Error: ' . mysql_error());
        }
        if ($id !== null) {
            $this->load($id);
        }
    }

    static public function getById($id)
    {
        $workitem = new WorkItem();
        $workitem->loadById($id);
        return $workitem;
    }

    public function loadById($id)
    {
        return $this->load($id);
    }

    protected function load($id = null)
    {
        if ($id === null && !$this->id) {
            throw new Workitem_Exception('Missing workitem id.');
        } elseif ($id === null) {
            $id = $this->id;
        }
        $query = "
                    SELECT
                        w.id,
                        w.summary,
                        w.creator_id,
                        w.runner_id,
                        w.mechanic_id,
                        w.status,
                        w.project_id,
                        w.notes,
                        w.sandbox,
                        w.bug_job_id,
                        w.is_bug,
                        w.status_changed,
                        p.name AS project_name
                    FROM  ".WORKLIST. " as w
                    LEFT JOIN ".PROJECTS." AS p ON w.project_id = p.project_id
                    WHERE w.id = '" . (int)$id . "'";
        $res = mysql_query($query);
        if (!$res) {
            throw new Workitem_Exception('MySQL error.');
        }
        $row = mysql_fetch_assoc($res);
        if (!$row) {
            throw new Workitem_Exception('Invalid workitem id.');
        }
        $this->setId($row['id'])
             ->setSummary($row['summary'])
             ->setCreatorId($row['creator_id'])
             ->setRunnerId($row['runner_id'])
             ->setMechanicId($row['mechanic_id'])
             ->setStatus($row['status'])
             ->setProjectId($row['project_id'])
             ->setNotes($row['notes'])
             ->setSandbox($row['sandbox'])
             ->setBugJobId($row['bug_job_id'])
             ->setIs_bug($row['is_bug'])
             ->setWorkitemSkills();
        $this->status_changed = $row['status_changed'];
        $this->project_name = $row['project_name'];
        return true;
    }

    public function idExists($id)
    {
        $query = '
SELECT COUNT(*)
FROM ' . WORKLIST . '
WHERE id = ' . (int)$id;
        $res = mysql_query($query);
        if (!$res) {
            throw new Workitem_Exception('MySQL error.');
        }
        $row = mysql_fetch_row($res);
        return (boolean)$row[0];
    }

    public function setId($id)
    {
        $this->id = (int)$id;
        return $this;
    }

    public function getId()
    {
        return $this->id;
    }

    public function setSummary($summary)
    {
        $this->summary = $summary;
        return $this;
    }

    public function getSummary()
    {
        return $this->summary;
    }
    
    public function setBugJobId($id) {
        $this->bugJobId = intval($id);
        return $this;
    }
    public function getBugJobId() {
        return $this->bugJobId;
    }
    

    public function setCreatorId($creatorId)
    {
        $this->creatorId = (int)$creatorId;
        $this->setCreator();
        return $this;
    }

    public function getCreatorId()
    {
        return $this->creatorId;
    }

    public function setRunnerId($runnerId)
    {
        $this->runnerId = (int)$runnerId;
        $this->setRunner();
        return $this;
    }

    /**
     *
     * Get users with fees
     * in original bug job
     *
     * @return ARRAY list of users id
     */
    public function getUsersWithFeesBugId() {
    
        //Read Bug Job workitem
        $bugItem = new WorkItem();
        $bugItem->loadById($this->getBugJobId());
        
        //return users with fees in original job
        return ($bugItem->getUsersWithFeesId());
    }
    
    /**
     *
     * Get users with fees in work item
     *
     * @return ARRAY list of users id
     */
    public function getUsersWithFeesId() {
    
        $query = "SELECT user_id FROM `" .FEES."` WHERE worklist_id = ".$this->id;
        $result_query = mysql_query($query);
        if($result_query) {
            $temp_array = array();
            while($row = mysql_fetch_assoc($result_query)) {
                $temp_array[] = $row['user_id'];
            }
            return $temp_array;
        } else {
        	return null;
        }
    }
    
    public function getRunnerId()
    {
        return $this->runnerId;
    }

    public function setMechanicId($mechanicId)
    {
        $this->mechanicId = (int)$mechanicId;
        $this->setMechanic();
        return $this;
    }

    public function getMechanicId()
    {
        return $this->mechanicId;
    }
    
    protected function setCreator()
    {
        $user = new User();
        $this->creator = $user->findUserById($this->getCreatorId());
        return $this;
    }
    
    protected function setRunner()
    {
        $user = new User();
        $this->runner = $user->findUserById($this->getRunnerId());
        return $this;
    }
    
    protected function setMechanic()
    {
        $user = new User();
        $this->mechanic = $user->findUserById($this->getMechanicId());
        return $this;
    }
    
    public function getCreator()
    {
        return $this->creator;
    }
    
    public function getRunner()
    {
        return $this->runner;
    }
    
    public function getMechanic()
    {
        return $this->mechanic;
    }

    public function setStatus($status)
    {
        $this->status = $status;
        return $this;
    }

    public function getStatus()
    {
        return $this->status;
    }

    public function setProjectId($project_id)
    {
        $this->project_id = $project_id;
        return $this;
    }

    public function getProjectId()
    {
        return $this->project_id;
    }

    public function setNotes($notes)
    {
        $this->notes = $notes;
        return $this;
    }

    public function getNotes()
    {
        return $this->notes;
    }
	
    public function setIs_bug($is_bug)
    {
        $this->is_bug = $is_bug;
        return $this;
    }

    public function getIs_bug()
    {
        return $this->is_bug;
    }

	
    public function setSandbox($sandbox)
    {
        $this->sandbox = $sandbox;
        return $this;
    }

    public function getSandbox()
    {
        return $this->sandbox;
    }
    
    /**
     *
     * Lookup original item summary for bug job
     *
     * @param
     * @return STRING	original job summary
     */
    public function getBugJobSummary() {
    
        $query=sprintf("SELECT w.summary FROM ". WORKLIST .
                        " w WHERE w.id =%d",$this->getBugJobId());
        $result = mysql_query($query);
        $row = mysql_fetch_assoc($result);
        
        return $row['summary'];
    }
    
    public function setWorkitemSkills($skills = false) {
        // if no array provided, get skill from db
        if (! $skills) {
            $query = "SELECT s.skill
                      FROM ".SKILLS." AS s, ".WORKITEM_SKILLS." AS ws
                      WHERE s.id = ws.skill_id AND ws.workitem_id = " . $this->getId();

            $result = mysql_query($query);
            if (mysql_num_rows($result)) {
                while ($row = mysql_fetch_assoc($result)) {
                    $this->skills[] = $row['skill'];
                }
            }
            
        } else {
            $this->skills = $skills;
        }
    }
    
    public function saveSkills() {
        // clear current skills
        if ($this->getId()) {
            $query = "DELETE FROM ".WORKITEM_SKILLS." WHERE workitem_id=" . $this->getId();
            $result = mysql_query($query);
            foreach ($this->skills as $skill) {
                $query = "INSERT INTO ".WORKITEM_SKILLS." (workitem_id, skill_id)
                          SELECT ".$this->getId().", id FROM ".SKILLS." WHERE skill='".$skill."'";
                mysql_query($query) || die('There was an error ' . mysql_error() . ' QUERY: ' . $query);
            }
            
            return true;
        } else {
            return false;
        }
    
    }

    public function getSkills() {
        return $this->skills;
    }

    public static function getStates()
    {
        $states = array();
        $query = 'SELECT DISTINCT `status` FROM `' . WORKLIST . '` LIMIT 0 , 30';
        $result = mysql_query($query);
        if ($result) {
            while ($row = mysql_fetch_assoc($result)) {
                $states[] = $row['status'];
            }
        }
        return $states;
    }

    public function getRepository() {
        $query = "SELECT `repository` FROM `projects` WHERE `project_id` = " . $this->getProjectId();
        $rt = mysql_query($query);
        if (mysql_num_rows($rt)) {
            $row = mysql_fetch_array($rt);
            $repository = $row['repository'];
            return $repository;
        } else {
            return false;
        }
    }
    
    protected function insert()
    {
        $query = "INSERT INTO ".WORKLIST." (summary, creator_id, runner_id, status,".
                 "project_id, notes, bug_job_id, created, is_bug, status_changed ) ".
            " VALUES (".
            "'".mysql_real_escape_string($this->getSummary())."', ".
            "'".mysql_real_escape_string($this->getCreatorId())."', ".
            "'".mysql_real_escape_string($this->getRunnerId())."', ".
            "'".mysql_real_escape_string($this->getStatus())."', ".
            "'".mysql_real_escape_string($this->getProjectId())."', ".
            "'".mysql_real_escape_string($this->getNotes())."', ".
            "'".intval($this->getBugJobId())."', ".
            "NOW(), ".
            "'".$this->getIs_bug()."', ".
            "NOW())";
        $rt = mysql_query($query);

        $this->id = mysql_insert_id();

        /* Keep track of status changes including the initial one */
        $status = mysql_real_escape_string($this->status);
        $query = "INSERT INTO ".STATUS_LOG." (worklist_id, status, user_id, change_date) VALUES (".$this->getId().", '$status', ".$_SESSION['userid'].", NOW())";
        mysql_unbuffered_query($query);

        if($this->status == 'BIDDING') {
            $this->tweetNewJob();
        }

        return $rt ? 1 : 0;
    }

    protected function update()
    {
        /* Keep track of status changes */
        if ($this->origStatus != $this->status) {
            if ($this->status == 'BIDDING') {
                $this->tweetNewJob();
            }
            $status = mysql_real_escape_string($this->status);
            $query = "INSERT INTO ".STATUS_LOG." (worklist_id, status, user_id, change_date) VALUES (".$this->getId().", '$status', ".$_SESSION['userid'].", NOW())";
            mysql_unbuffered_query($query);
        }

        $query = 'UPDATE '.WORKLIST.' SET
            summary= "'. mysql_real_escape_string($this->getSummary()).'",
            notes="'.mysql_real_escape_string($this->getNotes()).'",
            project_id="'.mysql_real_escape_string($this->getProjectId()).'",
            status="' .mysql_real_escape_string($this->getStatus()).'",
            status_changed=NOW(),
            runner_id="' .intval($this->getRunnerId()). '",
            bug_job_id="' .intval($this->getBugJobId()).'",
            is_bug='.$this->getIs_bug().',
            sandbox ="' .mysql_real_escape_string($this->getSandbox()).'"';
        $query .= ' WHERE id='.$this->getId();
        return mysql_query($query) ? 1 : 0;

    }

    protected function tweetNewJob()
    {
        if (!defined('TWITTER_OAUTH_SECRET') || TWITTER_OAUTH_SECRET=='' ) {
            return false;
        }
         
        if (empty($_SERVER['HTTPS']))
        {
            $prefix    = 'http://';
            $port    = ((int)$_SERVER['SERVER_PORT'] == 80) ? '' :  ":{$_SERVER['SERVER_PORT']}";
        }
        else
        {
            $prefix    = 'https://';
            $port    = ((int)$_SERVER['SERVER_PORT'] == 443) ? '' :  ":{$_SERVER['SERVER_PORT']}";
        }
        $link = $prefix . $_SERVER['HTTP_HOST'] . $port . '/rw/?' . $this->id;
        $summary_max_length = 140-strlen('New job: ')-strlen($link)-1;
        $summary = substr($this->summary, 0, $summary_max_length);
        
        $connection = new TwitterOAuth(TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, TWITTER_OAUTH_TOKEN, TWITTER_OAUTH_SECRET);
        $content = $connection->get('account/verify_credentials');
         
        $message='New job: ' . $summary . ' ' . $link;
        $connection->post('statuses/update', array('status' => $message));
    }


    public function save() {
        if(isset($this->id)){
            if ($this->idExists($this->getId())) {
                if ($this->update()) {
                    $this->saveSkills($this->skills);
                    return true;
                }
            } else {
                if ($this->insert()) {
                    $this->saveSkills($this->skills);
                    return true;
                }
            }
        } else {
            if ($this->insert()) {
                $this->saveSkills($this->skills);
            }
        }

        return false;
    }

    /**
     * @param int $worklist_id
     * @return array|null
     */
    public function getWorkItem($worklist_id)
    {
        $query = "SELECT w.id, w.summary,w.creator_id,w.runner_id, w.mechanic_id, ".
                 " u.nickname AS runner_nickname, u.id AS runner_id,".
                 " uc.nickname AS creator_nickname, w.status, w.notes, ".
                 " w.project_id, p.name AS project_name, p.repository AS repository,
                  w.sandbox, w.bug_job_id, w.is_bug
                  FROM  ".WORKLIST. " as w
                  LEFT JOIN ".USERS." as uc ON w.creator_id = uc.id
                  LEFT JOIN ".USERS." as u ON w.runner_id = u.id
                  LEFT JOIN ".PROJECTS." AS p ON w.project_id = p.project_id
                  WHERE w.id = '$worklist_id'";
        $result_query = mysql_query($query);
        $row =  $result_query ? mysql_fetch_assoc($result_query) : null;
        return !empty($row) ? $row : null;
    }

    /**
     * @param int $worklist_id
     * @param bool $expired If true, return expired bids
     * @return array|null
     */
    public function getBids($worklist_id, $expired = true) {
        $having = '';
        // code is here in case we want to start including expired bids
        // default behaviour is to ignore expired bids
        if ($expired === false) {
            $where = "AND TIMESTAMPDIFF(SECOND, NOW(), bids.`bid_expires`) > 0";
            $having = "HAVING `expires` > 0";
            $having = '';
        }

        $query = "
            SELECT bids.`id`, bids.`bidder_id`, bids.`email`, u.`nickname`, bids.`bid_amount`,
                UNIX_TIMESTAMP(bids.`bid_created`) AS `unix_bid_created`,
                TIMESTAMPDIFF(SECOND, NOW(), bids.`bid_expires`) AS `expires`,
                TIMESTAMPDIFF(SECOND, NOW(), bids.`bid_done`) AS `future_delta`,
                bids.`bid_done_in` AS done_in,
                DATE_FORMAT(bids.`bid_done`, '%m/%d/%Y') AS `bid_done`,
                UNIX_TIMESTAMP(`bid_done`) AS `unix_done_by`,
                bids.`notes`,
                UNIX_TIMESTAMP(f.`date`) AS `unix_bid_accepted`,
                UNIX_TIMESTAMP(NOW()) AS `unix_now`,
                bids.`bid_created` AS `bid_created_full`
            FROM `".BIDS. "` AS bids
                INNER JOIN `".USERS."` AS u ON (u.id = bids.bidder_id)
                LEFT JOIN ".FEES." AS f ON (f.bid_id=bids.id)
            WHERE bids.worklist_id={$worklist_id}
                AND bids.withdrawn = 0
            $having
            ORDER BY bids.`id` DESC";
        $result_query = mysql_query($query);
        if ($result_query) {
            $temp_array = array();
            while ($row = mysql_fetch_assoc($result_query)) {
                // skip expired bids if they have not been accepted
                if (! empty($row['unix_bid_accepted']) ) {
                    $row['expires'] = null;
                    $temp_array[] = $row;
                } else if ($row['expires'] < 0 && empty($row['unix_bid_accepted'])) {
                    // skip expired bids that are not accepted;
                } else {
                    $temp_array[] = $row;
                }
            }
            return $temp_array;
        } else {
            return null;
        }
    }

    public function getProjectRunnersId() {
        $query=" SELECT DISTINCT(runner_id) as runner FROM " .WORKLIST. " AS w WHERE w.project_id=".$this->getProjectId();
        $result_query = mysql_query($query);
        if($result_query) {
            $temp_array = array();
            while($row = mysql_fetch_assoc($result_query)) {
                $temp_array[] = $row['runner'];
            }
            return $temp_array;
        } else {
            return null;
        }
    }

    public function getFees($worklist_id)
    {
        $query = "SELECT fees.`id`, fees.`amount`, u.`nickname`, fees.`desc`,fees.`user_id`, DATE_FORMAT(fees.`date`, '%m/%d/%Y') as date, fees.`paid`, fees.`bid_notes`
            FROM `".FEES. "` as fees LEFT OUTER JOIN `".USERS."` u ON u.`id` = fees.`user_id`
            WHERE worklist_id = ".$worklist_id."
            AND fees.withdrawn = 0 ";

        $result_query = mysql_query($query);
        if($result_query){
            $temp_array = array();
            while($row = mysql_fetch_assoc($result_query)) {
            
                // this is to make sure to remove extra slashes 11-MAR-2011 <webdev>
                $row['desc'] = stripslashes($row['desc']);
                
                $temp_array[] = $row;
            }
            return $temp_array;
        } else {
            return null;
        }
    }

    public function placeBid($mechanic_id, $username, $itemid, $bid_amount, $done_in, $expires, $notes) {
        if($this->status == 'BIDDING') {
            $bid_expires = strtotime($expires);
            $query =  "INSERT INTO `".BIDS."` (`id`, `bidder_id`, `email`, `worklist_id`, `bid_amount`, `bid_created`, `bid_expires`, `bid_done_in`, `notes`)
                       VALUES (NULL, '$mechanic_id', '$username', '$itemid', '$bid_amount', NOW(), FROM_UNIXTIME('$bid_expires'), '$done_in', '$notes')";
        }
        else if($this->status == 'SUGGESTEDwithBID' || $this->status == 'SUGGESTED') {
            $query =  "INSERT INTO `".BIDS."` (`id`, `bidder_id`, `email`, `worklist_id`, `bid_amount`, `bid_created`, `bid_expires`, `bid_done_in`, `notes`)
                       VALUES (NULL, '$mechanic_id', '$username', '$itemid', '$bid_amount', NOW(), '1 years', '$done_in', '$notes')";
            }
        
        if($this->status == 'SUGGESTED') {
            mysql_unbuffered_query("UPDATE `".WORKLIST."` SET  `".WORKLIST."`.`status` = 'SUGGESTEDwithBID',`status_changed`=NOW() WHERE  `".WORKLIST."`.`id` = '$itemid'");
            }
        return mysql_query($query) ? mysql_insert_id() : null;
    
        }
    
    public function updateBid($bid_id, $bid_amount, $done_in, $bid_expires, $timezone, $notes) {
        $bid_expires = strtotime($bid_expires);
        if ($bid_id > 0 && $this->status != 'SUGGESTEDwithBID'){
        $query =  "UPDATE `".BIDS."` SET `bid_amount` = '".$bid_amount."' ,`bid_done_in` = '$done_in', `bid_expires` = FROM_UNIXTIME({$bid_expires}), `notes` = '".$notes."' WHERE id = '".$bid_id."'";
            mysql_query($query);
        }
        if ($bid_id > 0 && $this->status == 'SUGGESTEDwithBID'){
        $query =  "UPDATE `".BIDS."` SET `bid_amount` = '".$bid_amount."' ,`bid_done_in` = '$done_in', `bid_expires` = '1 years', `notes` = '".$notes."' WHERE id = '".$bid_id."'";
        mysql_query($query);
        }
        
        return $bid_id;
    }
    
    public function getUserDetails($mechanic_id)
    {
        $query = "SELECT nickname, username FROM ".USERS." WHERE id='{$mechanic_id}'";
        $result_query = mysql_query($query);
        return  $result_query ?  mysql_fetch_assoc($result_query) : null;
    }
// look for getOwnerSummary !!!
    public function getRunnerSummary($worklist_id) {
        $query = "SELECT `" . USERS . "`.`id` as id, `username`, `summary`"
          . " FROM `" . USERS . "`, `" . WORKLIST . "`"
          . " WHERE `" . WORKLIST . "`.`runner_id` = `" . USERS . "`.`id` AND `" . WORKLIST . "`.`id` = ".$worklist_id;
        $result_query = mysql_query($query);
        return $result_query ? mysql_fetch_assoc($result_query) : null ;
    }

    public function getSumOfFee($worklist_id)
    {
        $query = "SELECT SUM(`amount`) FROM `".FEES."` WHERE worklist_id = ".$worklist_id . " and withdrawn = 0 ";
        $result_query = mysql_query($query);
        $row = $result_query ? mysql_fetch_row($result_query) : null;
        return !empty($row) ? $row[0] : 0;
    }

    /**
     * Given a bid_id, get the corresponding worklist_id. If this is loaded compare the two ids
     * and throw an error if the don't match.  If not loaded, load the item.
     *
     * @param int $bidId
     * @return int
     */
    public function conditionalLoadByBidId($bid_id)
    {
        $query = "SELECT `worklist_id` FROM `".BIDS."` WHERE `id` = ".(int)$bid_id;
        $res = mysql_query($query);
        if (!$res || !($row = mysql_fetch_row($res))) {
            throw new Exception('Bid not found.');
        }
        if ($this->id && $this->id != $row[0]) {
            throw new Exception('Bid belongs to another work item.');
        } else if (!$this->id) {
            $this->load($row[0]);
        }
    }
				
    public function loadStatusByBidId($bid_id)
    {
        $query = "SELECT `worklist_id`," . WORKLIST . ".status FROM `".BIDS."` LEFT JOIN " . WORKLIST . " ON " . BIDS. ".worklist_id = " . WORKLIST . ".id WHERE " . BIDS . ".`id` = ".(int)$bid_id;
        $res = mysql_query($query);
        if (!$res || !($row = mysql_fetch_row($res))) {
            throw new Exception('Bid not found.');
        }
        return $row[1];
    }

    /**
     * Checks if a workitem has any accepted bids
     *
     * @param int $worklistId
     * @return boolean
     */
    public function hasAcceptedBids()
    {
        $query = "SELECT COUNT(*) FROM `".BIDS."` ".
            "WHERE `worklist_id`=".(int)$this->id." AND `accepted` = 1 AND `withdrawn` = 0";
        $res   = mysql_query($query);
        if (!$res) {
            throw new Exception('Could not retrieve result.');
        }
        $row = mysql_fetch_row($res);
        return ($row[0] > 0);
    }

    /**
     * If a given bid is accepted, the method returns TRUE.
     *
     * @param int $bidId
     * @return boolean
     */
    public function bidAccepted($bidId)
    {
        $query = 'SELECT COUNT(*) FROM `' . BIDS . '` WHERE `id` = ' . (int)$bidId . ' AND `accepted` = 1';
        $res   = mysql_query($query);
        if (!$res) {
            throw new Exception('Could not retrieve result.');
        }
        $row = mysql_fetch_row($res);
        return ($row[0] == 1);
    }

    // Accept a bid given it's Bid id
    public function acceptBid($bid_id, $is_mechanic = true) {
        $this->conditionalLoadByBidId($bid_id);
        /*if ($this->hasAcceptedBids()) {
            throw new Exception('Can not accept an already accepted bid.');
        }*/

        $res = mysql_query('SELECT * FROM `'.BIDS.'` WHERE `id`=' . $bid_id);
        $bid_info = mysql_fetch_assoc($res);
        $workitem_info = $this->getWorkItem($bid_info['worklist_id']);

        // Get bidder information
        $bidder = new User;
        if (! $bidder->findUserById($bid_info['bidder_id'])) {
            // If bidder doesn't exist, return false. Don't want to throw an
            // exception because it would kill multiple bid acceptances
            return false;
        }

        $bid_info['nickname'] = $bidder->getNickname();

        // If the project has a repository, give the user a checkout
        $repository = $this->getRepository();
        if ($repository) {
            // We don't want to fail user signup if sandboxes are not line
            // so we will not create unixusername until needed
            if ($bidder->getHas_sandbox()) {
                $new_user = false;
            } else {
                $bidder->setUnixusername(User::generateUnixusername($bidder->getNickname()));
                $new_user = true;
            }

            $bid_info['sandbox'] = "https://" . SANDBOX_SERVER . "/~" .
               $bidder->getUnixusername()."/".$repository."/";

            // Provide bidder with sandbox & checkout if they don't already have one
            // If the sandbox flag is 0, they are a new user and need one setup
            require_once("sandbox-util-class.php");
            $sandboxUtil = new SandBoxUtil;
            try {
                $sandboxUtil->createSandbox(
                    $bidder->getUsername(),
                    $bidder->getNickname(),
                    $bidder->getUnixusername(),
                    $this->getRepository(),
                    $new_user);
            } catch (Exception $e) {
                $error_email_body = "Error creating sandbox for user: " .
                    $bidder->getUsername()."\n. " .
                    "Script returned error: ".$e->getMessage();
                send_email("ops@lovemachineinc.com", "Sandbox creation error",
                              $error_email_body);
                $bid_info['sandbox'] = "N/A";
            }

            if ($new_user) {
                $bidder->setHas_sandbox(1);
                $bidder->save();
            }
        } else {
            $bid_info['sandbox'] = "N/A";
        }

        //adjust bid_done date/time
        $prev_start = strtotime($bid_info['bid_created']);
        $new_start = strtotime(date('Y-m-d H:i:s O'));
        // this is old-style bid, with bid_done date instead of bid_done_in relative time
        if (isset($bid_info['bid_done'])) {
            $end = strtotime($bid_info['bid_done']);
        } else {
            $end = strtotime($bid_info['bid_done_in']);
        }
        $diff = $end - $prev_start;
        $bid_info['bid_done'] = strtotime('+'.$diff.'seconds');

        // Adding transaction wrapper around steps
        if (mysql_query('BEGIN')) {

            // changing mechanic of the job
            if (! $myresult = mysql_query("UPDATE `".WORKLIST."` SET " . ($is_mechanic ? "`mechanic_id` =  '".$bid_info['bidder_id']."', " : '') . " `status` = 'WORKING',`status_changed`=NOW(),`sandbox` = '".$bid_info['sandbox']."' WHERE `".WORKLIST."`.`id` = ".$bid_info['worklist_id'])) {
                error_log("AcceptBid:UpdateMechanic failed: ".mysql_error());
                mysql_query("ROLLBACK");
                return false;
            }

            // marking bid as "accepted"
            if (! $result = mysql_query("UPDATE `".BIDS."` SET `accepted` =  1, `bid_done` = FROM_UNIXTIME('".$bid_info['bid_done']."') WHERE `id` = ".$bid_id)) {
                error_log("AcceptBid:MarkBid failed: ".mysql_error());
                mysql_query("ROLLBACK");
                return false;
            }

        
            // adding bid amount to list of fees
            if (! $result = mysql_query("INSERT INTO `".FEES."` (`id`, `worklist_id`, `amount`, `user_id`, `desc`, `bid_notes`, `date`, `bid_id`) VALUES (NULL, ".$bid_info['worklist_id'].", '".$bid_info['bid_amount']."', '".$bid_info['bidder_id']."', 'Accepted Bid', '".mysql_real_escape_string($bid_info['notes'])."', NOW(), '$bid_id')")) {
                error_log("AcceptBid:Insert Fee failed: ".mysql_error());
                mysql_query("ROLLBACK");
                return false;
            }


            // When we get this far, commit and return bid_info
            if (mysql_query('COMMIT')) {
                $bid_info['summary'] = getWorkItemSummary($bid_info['worklist_id']);
                $this -> setMechanicId($bid_info['bidder_id']);
                return $bid_info;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    public function validateAction($action, $action_error) {
        
        switch ($action) {
            case 'withdraw_bid':
                if ($this->getStatus() == 'DONE') {
                    $action_error = 'Cannot withdraw bid when status is DONE';
                    return false;
                }
                
                return $action;
                break;

            case 'save_workitem':
                if ($this->getStatus() == 'DONE') {
                    $action_error = 'Cannot change workitem when status is DONE';
                    return false;
                }
                
                return $action;
                break;

            case 'place_bid':
                if ($this->getStatus() != 'BIDDING') {
                    if ($this->getStatus() != 'SUGGESTEDwithBID') {
                        if ($this->getStatus() != 'SUGGESTED') {
                    $action_error = 'Cannot place bid when workitem is in this status';
                    return false;
                        }
                    }
                }
                    
                return $action;
                break;
            
            case 'edit_bid':
                if ($this->getStatus() != 'BIDDING') {
                    if ($this->getStatus() != 'SUGGESTEDwithBID') {
                        if ($this->getStatus() != 'SUGGESTED') {
                    $action_error = 'Cannot edit bid for this workitem status';
                    return false;
                        }
                    }
                }
                    
                return $action;
                break;
            
            case 'add_fee':
                if ($this->getStatus() == 'DONE') {
                    $action_error = 'Cannot add fee when status is DONE';
                    return false;
                }
                
                return $action;
                break;

            case 'add_tip':
                if ($this->getStatus()== 'DONE' || $this->getStatus() == 'PASS' || $this->getStatus() == 'SUGGESTED') {
                    $action_error = 'Cannot add tip when status is DONE, PASS or SUGGESTED';
                    return false;
                }
                
                return $action;
                break;
                
            case 'accept_bid':
                if ($this->getStatus() != 'BIDDING') {
                    if ($this->getStatus() != 'SUGGESTEDwithBID') {
                        if ($this->getStatus() != 'SUGGESTED') {
                    $action_error = 'Cannot accept bid when status is not BIDDING';
                    return false;
                        }
                    }
                }
                
                return $action;
                break;

            case 'accept_multiple_bid':
                if ($this->getStatus() != 'BIDDING') {
                    if ($this->getStatus() != 'SUGGESTEDwithBID') {
                        if ($this->getStatus() != 'SUGGESTED') {
                    $action_error = 'Cannot accept bid when status is not BIDDING';
                    return false;
                        }
                    }
                }
                
                return $action;
                break;

            case 'status-switch':
                return $action;
                break;
                
            case 'save-review-url':
                if ($this->getStatus() == 'DONE' || $this->getStatus() == 'COMPLETED') {
                    $action_error = 'Cannot change review URL when status is DONE or COMPLETED';
                    return false;
                }
                
                return $action;
                break;
                
            case 'invite-people':
                if ($this->getStatus() == 'DONE') {
                    $action_error = 'Cannot invite people when status is DONE';
                    return false;
                }
                
                return $action;
                break;

            case 'new-comment':
                if ($this->getStatus() == 'DONE') {
                    $action_error = 'Cannot add comment when status is DONE';
                    return false;
                }
                
                return $action;
                break;
                
            case 'edit':
                return $action;
                break;

            default:
                $action_error = 'Invalid action';
                return false;
        }
    }

}// end of the class
