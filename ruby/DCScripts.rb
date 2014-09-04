# Fudge UAT

fr_id = [32062, 32003]
fr_id.each do |id|
  fr = FlyerRun.find id
  fr.available_from = 4.days.ago
  fr.available_to = 400.years.from_now
  fr.state = 100

  fr.height_mode_modifier = 3 if id == 32062
  fr.height_mode_modifier = 1 if id == 32003

  fr.save!
  fr.flyers.each do |f|
    f.available_from = 4.days.ago
    f.available_to = 400.years.from_now
    raise "lol" if f.stores.blank?
    f.save!
  end
end


# WALMART LINKS

"http://partneruat4.circularhub.com/hosted_services/walmart?type=1&locale=en-US&postal_code=92011&store_code=5886&flyer_type_name=circular&flyer_run_id=32003"
"http://partneruat4.circularhub.com/hosted_services/walmart?type=1&locale=en-US&postal_code=92011&store_code=5886&flyer_type_name=grocery&flyer_run_id=32062