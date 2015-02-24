################
# @FlyerKiller #
################
f_ids = [274421,274425]
f_ids.each do |f_id|
  f = Flyer.find(f_id)
  s = Sessions::Flyer::TileGeneration.where(:flyer_id => f.id).last
  s.state = 6; s.save!; f.state = 3; f.save!
end



#############
# @FlyerRun #
#############
fids = [32431,32063]
fids.each do |fid|
  fr = FlyerRun.find(fid)
  fr.flyers.each do |f|
    ContentAggregation::Gatherer.new(fr.merchant,f.page_items).start
  end
end



#######################
# @Codesheetgenerator #
#######################
"
prod: bundle exec script/code_sheets/homedepot_canada_codesheet_generator.rb '/FW28'
gw2: scp dzhang@proc4.fadmin.wishabi.net:/tmp/2cdc0e24-2942-11e4-9014-12313d3006ab/home_depot.code_sheet.csv ~/
local: scp dzhang@gw2:~/home_depot.code_sheet.csv ~/Desktop
mysqldump -u fadmin -h db1.fadmin.wishabi.net -pngMc2gQwgaqB fadmin_production --tables ftp_files > /tmp/ftp_files.sql
scp dzhang@db1.fadmin.wishabi.net:/tmp/ftp_files.sql ftp_files.sql
scp dzhang@gw2.wishabi.ca:~/ftp_files.sql ftp_files.sql
"



#################
# @FileReloader #
#################
load "#{Rails.root}/lib/cutout_generator.rb"
load "#{Rails.root}/app/models/page_modules/item_cutout_generation.rb
load "#{Rails.root}/lib/code_sheets/parsers/staples_usa.rb"
load "#{Rails.root}/app/mailers/m1000_mailer.rb"
load "#{Rails.root}/app/models/merchant_modules/ftp.rb"
/Users/ezdz/Workspace/fadmin
/Users/ezdz/Workspace/fadmin

def load_codesheet( name )
  begin
    load "#{Rails.root}/lib/code_sheets/pre_processors/#{name}.rb"
    load "#{Rails.root}/lib/code_sheets/parsers/#{name}.rb"
    load "#{Rails.root}/lib/code_sheets/pre_processors/#{name}_stores.rb"
    load "#{Rails.root}/lib/code_sheets/parsers/#{name}_stores.rb"
  rescue
    puts "Missing some files"
  end
  puts "Done"
end



################
# @fudgeflyers #
################
m = Merchant.find_by_name_identifier "safewaycanada"
m.flyers.each {|fr| fr.available_to = 40.days.from_now; fr.save! }
m.flyer_runs.each {|fr| fr.available_to = 40.days.from_now; fr.save! }



###############
# @datapiping #
###############
fr = FlyerRun.find 29763
fr.pages.each do |p|
  ContentAggregation::Gatherer.new(fr.merchant,p.page_items).start
end



#################
# @FSAS FUDGING #
#################
fr_new = FlyerRun.find 34160
fr_old = FlyerRun.find 17741
fr_new.flyers.each { |f|
  f_old = fr_old.flyers.select{ |f_old|
    f_old.description == f.description; }.first
  if f_old.fsas == f.fsas
    puts "NO"
  else
    puts "YES"
  end

  f_old.fsas = f.fsas
  f_old.save!
} ; nil

old_count = 0
fr_old.flyers.each { |f|
  old_count += f.fsas.split(" ").count
}
new_count = 0
fr_new.flyers.each { |f|
  new_count += f.fsas.split(" ").count
}



#################
# @STORE UPLOAD #
#################
m = Merchant.find 2047
temp.each do |in_t|
  f = Flyer.find in_t[0]
  if f.stores.blank?
    in_t[1..(in_t.count-1)].each do |sid|
      store = m.stores.select{|s| s.merchant_store_code == "#{sid}"}.first
      begin
        f.stores << store
      rescue
        puts "#{sid} already taken"
      end
    end
  end
  f.save!
end



######################
# @DCAPPSURPPRESSION #
######################
flyer_run_id = 17887
dc_app_flyer_run_id = 601
fr = FlyerRun.find flyer_run_id
fr.flyers.each do |f|
  sup = Dc::App::Flyer.new(
    :dc_app_flyer_run_id => dc_app_flyer_run_id,
    :suppress => true,
    :flyer_id => f.id
    )
  sup.save!
end




###################
# @Kill spotlight #
###################
fr.flyers.each do |f|
  f.flyer_items.
    select{ |fi| fi.display_type == 17 }.each do |fi|
    fi.mark_as_deleted
  end
end ; nil



###############
# @INSERTPAGE #
###############
insert_index = 4
fr = FlyerRun.find 17887
insert_page = Page.find 921357

fr.flyers.each do |f|
  pf_links = PageFlyerLink.where('flyer_id = ?', f.id)
  # Push everything past index +1
  pf_links.select{ |pf| pf.position >= insert_index }.each{ |pf| pf.update_attributes(:position => pf.position + 1)}
  # Insert new page
  PageFlyerLink.new(:flyer_id => f.id, :page_id => insert_page.id, :position => insert_index).save!
end


##############
# @CREATE DC #
##############
fr = FlyerRun.find 37037
dc_page_number = 1
dc_options = {
  "name" => "Holiday Basket",
  "handle_url" => "https://f.wishabi.net/dynamic_content/prod/merchants/biglots/PS-805-GiftBasket-bust01/tab.html",
  "frame_url" => "https://f.wishabi.net/dynamic_content/prod/merchants/biglots/PS-805-GiftBasket-bust01/gift-basket.html",
  "frame_mobile_url" => "https://f.wishabi.net/dynamic_content/prod/merchants/biglots/PS-805-GiftBasket-bust01/gift-basket-mob.html",
  "loading_image" => "",
  "loading_image_mobile" => "",
}
fr.flyers.each do |f|
  dc = Dc::FlyerTear::App.new(
    :flyer_id => f.id,
    :page_number => dc_page_number,
    :options => dc_options,
    :starts_open => true,
    :toggleable => true,
    :shift => 0,
  )

  dc.options = dc_options
  dc.save!
end






#Remove stores
f_ids = [267092, 267104, 267113, 267143, 267238, 267240, 267243]

stores_hash = {}
m = Merchant.find 2613
m.stores.each do |s|
  stores_hash[s.merchant_store_code] = s.id
end

stores_to_keep = []

errors = []
f_ids.each do |id|
  f = Flyer.find id
  stores_to_delete = f.stores.map(&:merchant_store_code) - stores_to_keep
  stores_to_delete.each do |s|
    puts "#{s}"
    sf = StoresFlyer.where(:store_id => stores_hash[s], :flyer_id => f.id).last
    if sf.present?
      sf.mark_as_deleted
    else
      errors << s
    end
  end
end

# UNDO
fr.flyers.each do |f|
  StoresFlyer.where(:flyer_id => f.id).all.each do |s|
    s.deleted = false
    s.save!
  end
end






hash = {}
arr.each do |a|
  hash[a[1]] ||= []
  hash[a[1]] << a[0]
end

fr = 17885
flyer_run = FlyerRun.find 17885
pages = Page.where(:flyer_run_id => fr).where(['filename LIKE ?', '05_99_%.pdf'])
pages.each do |p|
  hash[p.filename].each do |pz|
    f = flyer_run.flyers.where(:description => pz).last
    pf_links = PageFlyerLink.where(:flyer_id => f.id).where('position > 5').each{ |pf | pf.update_attributes(:position => pf.position + 1)}

    PageFlyerLink.new(:flyer_id => f.id, :page_id => p.id, :position => 6).save!
  end
end



chosen_ones = [2175,2550,2582,2553,2246,2366]
survivors = []
killed_elders = []
killed_children = []
mutants = []
Dc::App::FlyerRun.all.each { |dcfr|
  fr = FlyerRun.find dcfr.flyer_run_id
  if chosen_ones.include? fr.merchant_id
    survivors << dcfr
    next
  end
  fr.flyers.each { |f|
    sup = Dc::App::Flyer.where(
      :dc_app_flyer_run_id => dcfr.id,
      :flyer_id => f.id
    ).first
    puts sup.dc_app_flyer_run_id if sup.present?
    begin
      if sup.blank?
        puts "Created sup at #{f.id}"
        sup = Dc::App::Flyer.new(
          :dc_app_flyer_run_id => dcfr.id,
          :suppress => true,
          :flyer_id => f.id,
          :page_number => dcfr.page_number
          )
        sup.save!
        killed_children << sup
      elsif sup.suppress == false
        puts "Killed sup at #{f.id}"
        sup.suppress = true
        sup.save!
        killed_elders << sup
      end
    rescue
      puts "Found mutant"
      mutants << f.id
      next
    end
  }
} ; nil




h = {}
CSV.foreach("m_stores.csv", :headers => true) do |row|
  h["#{row[1]}"] ||= []
  h["#{row[1]}"] << row[0]
end

# Store upload with hash
fr = FlyerRun.find 38813
m = fr.merchant
ret = []
h.each_pair do |k, v|
  f = fr.flyers.select{ |f| f.description == k }.first
  if f.blank?
   ret << "Flyer #{k}"
  else
    v.each do |value|
      store = m.stores.select{ |s| s.merchant_store_code == value }.first
      if store.blank?
        ret << "Store #{value}"
      else
        if StoresFlyer.where(:flyer_id => f.id, :store_id => store.id).blank?
          StoresFlyer.create!(:flyer_id => f.id, :store_id => store.id).save!
          ret << "Added #{value}"
        end
      end
    end
  end
end

def hammer
  fr = FlyerRun.find
  sleep(Time.parse("2014-10-13 4:10:00") - Time.now)

  Dc::DataUpload::Custom::HomeDepotCanadaHammerDrop.new(fr.id, m.id).start
end

line = 0
string = "["
CSV.foreach("cookies 2.csv") do |row|
  string += "{"
  string += "\"domain\": \"#{row[0]}\","
  string += "\"expirationDate\": \"#{row[4]}\","
  string += "\"hostOnly\": \"#{row[1]}\","
  string += "\"httpOnly\": \"#{row[1]}\","
  string += "\"name\": \"#{row[5]}\","
  string += "\"path\": \"#{row[2]}\","
  string += "\"secure\": \"#{row[3]}\","
  string += "\"session\": \"#{row[3]}\","
  string += "\"storeId\": \"0\","
  if row[7].present?
    string += "\"value\": \"#{row[6]},#{row[7]}\","
  else
    string += "\"value\": \"#{row[6]}\","
  end
  string += "\"id\": \"#{line}\","
  line += 1
  string += "},"
end
string += "]"

browser = WatirFetcher.new
CSV.foreach("frozen.csv", :headers => true) do |row|
  url = row['item_url']
  browser.goto_url url
  browser.fetch_page
  price = browser.xpath(".//div[@class='js-price-display price price-display']")
  if price.blank?
    price = browser.xpath(".//div[@class='js-price-display price price-display price-display-oos-color']")
  end
  if price.blank?
    puts
    next
  end
  description = browser.xpath(".//section[@class='product-about js-about-item']/div[@class='js-ellipsis module']/p").inner_text.truncate(255)
  if description.blank?
    description = browser.xpath(".//div[@class='js-ellipsis module']/div[@class='ellipsis-content module']/p").inner_text.truncate(255)
  end

  image = browser.xpath(".//img[@class='product-image js-product-image js-product-primary-image']/@src").inner_text
  puts "#{price.inner_text.strip.gsub("$","")},\"#{description}\",#{image}"
end

browser = WatirFetcher.new :proxy => {:host => "209.20.28.194", :port => "3128"}
browser.goto_url "http://www.staples.ca/en/Samsung-Galaxy-Tab-4-SM-T530NYKAXAC-Android-44-101-Capacitive-Multi-Touchscreen/product_1008966_2-CA_1_20001"
browser.load_cookies(CookieFileParser.parse("#{Rails.root}/lib/content_aggregation/js_pre_processors/cookies/staples_cookies.txt", :valid_domain => "staples.ca"))
browser.goto_url "http://www.staples.ca/en/Samsung-Galaxy-Tab-4-SM-T530NYKAXAC-Android-44-101-Capacitive-Multi-Touchscreen/product_1008966_2-CA_1_20001"
n = Nokogiri::HTML.parse(browser.browser.html) ; nil
n.xpath(".//div[@class='g03']/div[@class='c03']/div[@class='b004']/h1[@class='h01']").inner_text

# FIND MERCHANTS
["menards", "homeoutfitterscom", "macys", "homedepotcanada", "foodlion", "londondrugs", "jcpenney", "targetcanada", "generalwarehouseltd", "sportsauthority", "biglots", "radioshack", "federatedcoop"]


was_killed = []
killed_elders.each do |sup|
  f = Flyer.find sup.flyer_id
  was_killed << f.flyer_run_id
end
killed_children.each do |sup|
  f = Flyer.find sup.flyer_id
  was_killed << f.flyer_run_id
end
m_killed = []
was_killed.each do |id|
  fr = FlyerRun.find id
  m_killed << fr.merchant.name_identifier
end


# REVERT TO SAVE
killed_children.each do |sup|
  if sup.present?
    sup.mark_as_deleted
    sup.save!
  end
end
killed_elders.each do |sup|
  if sup.present?
    sup.suppress = false
    sup.save!
  end
end



# TURN ON SURVIVORS
survivors.each do |s|
  fr = FlyerRun.find s.flyer_run_id
  fr.flyers.each { |f|
    sup = Dc::App::Flyer.where(
      :dc_app_flyer_run_id => s.id,
      :flyer_id => f.id
    ).first
    if sup.created_at > 20.minutes.ago
      sup.mark_as_deleted
    elsif sup.updated_at > 20.minutes.ago
      sup.suppress = false
      sup.save
    else
      puts "okay"
    end
  }
end


vi lib/content_aggregation/js_pre_processors/staples_canada.rb
load "lib/content_aggregation/js_pre_processors/staples_canada.rb"
url = @item.send("url") || @item.send( "data_piping_url" )
qar3fcs


asdfghjkl;


pis =  [14086208, 14086209, 14086211, 14086212, 14086213, 14086219, 14086221, 14086222, 14728887, 14121182, 14121183, 14121185, 14121187, 14121188, 14121189, 14121190, 14121194, 14121195, 14728889, 14094625, 14117896, 14117901, 14121196, 14121197, 14121198, 14121200, 14121201, 14121202, 14121204]
page_items = []
m = Merchant.find 2175
pis.each do |id|
  page_items << PageItem.find(id)
end

ContentAggregation::Gatherer.new(m,page_items).start ; nil
page_items.each do |pi|
  pi.reload; pi.push_to_flyers
end ; nil




fr.flyers.each do |f|
  f.reload
  fsas = f.fsas.split(" ")
  fsas_to_keep = fsas - fsas_to_remove
  f.fsas = fsas_to_keep.join(" ")
  f.save!
end




fr.pages.each do |p|
  p.page_items.each do |pi|
    if pi.bonus_offer_description.present?
      pi.sale_story = pi.bonus_offer_description
      pi.bonus_offer_description = nil
      pi.save!
    end
  end
end



page_items = []
all_items = []
fr.pages.each{ |p| page_items.concat p.page_items }
page_items.each{ |p| all_items.concat p.sub_items }
all_items.each do |ai|
  if ai.name =~ /A\s/
    ai.name = ai.name.gsub(/A\s/,"\u00AE\s")
  end
  if ai.name =~ /TM\s/
    ai.name = ai.name.gsub(/TM\s/,"\u2122\s")
  end
  ai.save!
end
page_items.each(&:push_to_flyers)





cat_ids = [6914, 7652, 2188, 167, 1719, 4553, 7649, 7616, 7650, 7651]
fr.pages.each do |p|
  cat_ids.each do |id|
    lol = Page::Category.where(:category_id => id,:flyer_run_id => 35739,:page_id => p.id).last
    if lol.blank?
    Page::Category.new(
      :flyer_run_id => 35739,
      :page_id => p.id,
      :category_id => id
      ).save!
    end
  end
end

page_items.each do |pi|
next if pi.url.blank? || pi.url.present? || pi.display_type != 1
pi.url = base_url("lol",pi.sku.split(",").first)
pi.save!
end





proc3 38561 /holidayimages14
proc4 38592 /toycat2014
proc5 34158 /babyrefreshimages

page_items = []
fr = FlyerRun.find 34158
ftp_url = "/babyrefreshimages"
options = {
  :from_scratch => false,
  :ftp_url => ftp_url
}
fr.add_images(
  ftp_url,
  options
  )

fr.pages.each do |p|
  page_items.concat p.page_items
end

errors = []
page_items.each do |pi|
  next if pi.pdf_image.blank?
  puts "processing #{pi.id}"
  local_file_name = "/tmp/lol.jpg"
  png_local_file_name = "/tmp/lol.png"
  img = pi.pdf_image
  img.send('download_from_s3',*[local_file_name,img.original_image_path])
  # Run magick
  cmd = "convert \"#{local_file_name}\" "
      cmd += "-profile /opt/USWebCoatedSWOP.icc "
      cmd += "-profile /opt/AdobeRGB1998.icc "
      cmd += "\"#{png_local_file_name}\" 2>&1"

  # add to errors, but keep processing
  output = `#{cmd}`
  if $?.exitstatus != 0
    puts output
    errors << pi.id
    next
  end

  img.image_source_filename = png_local_file_name
  img.process_image!

  fr.send('_add_image_to_flyer_run',*[ftp_file,png_local_file_name])
  pi.push_to_flyers
end





Retailer - Publication Type Name - Publication Run Name - Timestamp
fr = FlyerRun.find 17750
CSV.open("#{fr.merchant.name} - #{fr.flyer_type.name} - #{fr.name} - #{DateTime.now}.csv","wb") do |csv|
  csv << ["publication_id","publication_run_id","item_id","item_ttm_url","item_name","item_description","page_number","categories"]
  fr.flyers.each do |f|
    f.flyer_items.normal.active.order('flyer_items.`left` ASC').each do |fi|
      cat = fi.flyer_item_categories.map(&:name).uniq.join(",")
      csv << [
        f.id,
        fr.id,
        fi.id,
        fi.url,
        fi.name,
        fi.description.try(:gsub, /\s+/," "),
        fi.page_item.page.page_flyer_links.where(:flyer_id => f.id).first.position,
        (cat.blank? ? nil : cat)
      ]
    end
  end
end

Ordering: left to right, top to bottom
-> publication_id
-> publication_run_id
-> item_id
-> item_ttm_url
-> item name
-> item description
-> page number
-> categories

csv = CSV.open("/home/fadmin/app/current/walmart_dump_no_affiliate_tracking.csv", "w+", :col_sep => "|")



csv << [f.id,
fr.id,
fi.id,
fi.url,
fi.name,
fi.description.try(:gsub, /\s+/," "),
fi.page_item.page.page_flyer_links.where(:flyer_id => f.id).first.position, cat.blank? ? nil : cat]
end
end
csv.close




fids = [11042,15574,31120,31121,38651,31123,33883,31122,31128,33884,38652,38653,33885,31124,31125,31126,31127,31129]

fids.each do |id|
  fr = FlyerRun.find id
  items = fr.flyers.map(&:page_items).flatten
  items.select{|i|
    i.price_text =~ /\$(\d+)(\s|$)/
  }.each{|i|
    i.price_text.match(/\$(\d+)(\s|$)/)
    i.price_text.gsub!(/\$(\d+)(\s|$)/,"$#{$1}.00 ")
    i.save!
    i.push_to_flyers
  }
end





zips = %w(83001)
region = SupportData::SportsAuthorityRegions.new
region.merchant_store_code = "STMT"

fsas = []
zips.each do |zip|
  fsas.push(zip)

  # If this zip code already appears in another region, remove it from that region's zip_codes list
  other_region = SupportData::SportsAuthorityRegions.where('zip_codes LIKE ?', "%#{zip}%").first
  if other_region.present?
    other_region.zip_codes = (other_region.zip_codes.split(" ") - [zip]).join(" ")
    puts "removing #{other_region.id}"
    other_region.save!
  end

  zc = ZipCode.where(:zip_code => zip).first

  # Get all zip codes within the 24km radius
  nearby_zips = ZipCode.find_all_within_distance(zc, 24.0)

  # For each nearby zip, exclude it from any other region and add it to our list for our new region
  nearby_zips.each do |nz|
    fsas.push(nz.zip_code)
    other_region = SupportData::SportsAuthorityRegions.where('zip_codes LIKE ?', "%#{nz.zip_code}%").first
    if other_region.present?
      other_region.zip_codes = (other_region.zip_codes.split(" ") - [zip]).join(" ")
      puts "removing #{other_region.id}"
      other_region.save!
    end
  end
end

# Finally, save our region with the fsas that we just collected
region.zip_codes = fsas.uniq.join(" ")
region.save!


fr = FlyerRun.find 39798
CSV.foreach('export.csv', :headers=> true ) do |row|
fi = FlyerItem.find row[0]
pi = fi.page_item
next if row[1].blank? || row[2].blank?
pi.valid_from = Date.parse(row[1])
pi.valid_to = Date.parse(row[2])
puts pi.save!
end
fr.pages.each(&:push_to_flyers)

h = {}
CSV.foreach("walmart.csv", :headers=>true) do |row|
  h[row[1]] ||= []
  h[row[1]] << row[0]
end

fr = FlyerRun.find 39798
count = 0
h.each_pair do |k,v|
  f = fr.flyers.where(:description => k).first
  all_stores = f.stores.collect(&:merchant_store_code)
  keep_stores = v
  delete_stores = all_stores - keep_stores
  delete_stores.each do |s|
    store = f.stores.where(:merchant_store_code => s).first
    puts "removing #{store.merchant_store_code}"
    StoresFlyer.where(:flyer_id => f, :store_id => store.id).first.destroy
    count += 1
  end
end

all = []
list = ['ralphs', 'kingsoopers','krogeratlanta','krogercentral','krogercincinnati','krogercolumbus','krogerdelta','krogerlouisville','krogermichigan','krogermidatlantic','krogernashville','krogersouthwest','fredmeyer','citymarket','foodforless','jaycfoodstores','owens','paylesssupermarkets','qualityfoodcenters','bakers','dillonsfoodstores','frysfoodstores','gerbes','smiths','foodsco','dillons']
list.each do |mid|
  m = Merchant.find_by_name_identifier mid
  m.flyer_runs.active.current_run.each do |fr|
    items = fr.flyers.map(&:flyer_items).flatten
    items.each do |i|
      i.update_attribute('in_store_only','false')
    end
  end
end


CSV.foreach('nov16.csv', :headers => true) do |row|
  next if row[1].blank?
  fi = FlyerItem.find row[0]
  pi = fi.page_item
  pi.keywords = row[1]
  pi.save!
  pi.push_to_flyers
  pi.siblings.each do |i|
    i.keywords = row[1]
    i.save!
    i.push_to_flyers
  end
end

hash = {}
items.each do |i|
  hash[i.keywords] ||= {}
  hash[i.keywords]['count'] ||= 0
  hash[i.keywords]['count'] += 1
  hash[i.keywords]['items'] ||= []
  hash[i.keywords]['items'] << i.name
end



report = {}
dcs = Dc::App::FlyerRun.all
dcs.each do |dc|
  fr = FlyerRun.find dc.flyer_run_id
  m = fr.merchant
  report[m.name_identifier] ||= []
  report[m.name_identifier] << {
    :frame_url => dc.frame_url,
    :frame_mobile_url => dc.frame_mobile_url,
    :id => dc.id
  }
end


fr = FlyerRun.find








