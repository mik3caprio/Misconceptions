<?php include '../header.inc.php'; ?>
<div class="front" id="question">
	<h2><?php echo $question ?></h2>
	<img src="/assets/img/img-solar-system-2.png" alt="The solar system.">
	<p>The Earth's revolution around the sun causes night and day.</p>
	<div class="cta">
		<button id="yes"><?php echo $yes ?></button>
		<button id="no"><?php echo $no ?></button>
	</div>
</div>
<div class="back" id="answer">
	<h2><?php echo $answer ?></h2>
	<img src="/assets/img/img-earth-2.png" alt="A closeup of the Earth">
	<p>
		<strong class="yes">Wrong.</strong>
		<strong class="no">Correct!</strong> 
		Half of Earth is exposed to Sun while the other half is deprived of light. It is the rotation that causes day and night.		
	</p>
	<div class="cta">
		<a target="_blank" class="button" href="http://wiki.answers.com/Q/What_causes_day_and_night_on_earth" id="more">I want to learn more about stars!</a>
		<a class="button" href="<?php echo $link_to_next ?>" id="next"><?php echo $next ?></a>
	<div>
</div>
<?php include '../footer.inc.php'; ?>